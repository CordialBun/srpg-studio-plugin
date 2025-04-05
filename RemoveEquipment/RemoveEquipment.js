/*-----------------------------------------------------------------------------------------------------------------

装備を外すコマンド Ver.1.00


【概要】
本プラグインを導入すると、アイテムコマンドで装備中の武器を選択したとき、「装備」の代わりに「外す」コマンドが表示されるようになります。

SRPG Studioの従来の仕様では、ユニットが装備可能な武器を所持している場合、
その中で一番上に位置する武器を自動的に装備しているものとして扱われますが、
「外す」コマンドを使用するとその武器を外すことができます。
つまり「装備可能な武器を所持しているが、装備はしていない」という状態を意図的に作ることができます。
武器を外しているときに他のユニットから攻撃された場合、当然反撃はできません。

武器を外した後も、以下のタイミングでは自動的に装備されます。
・他のユニットとのアイテム交換が行われたとき
・拠点画面に入ったとき
・そのユニットが新たにマップに登場したとき

また、武器を装備しているかどうか判別できるよう、装備中の武器の右側には「E」のアイコンが表示されます。


【使い方】
本プラグインをプロジェクトのPluginフォルダ配下に保存し、必要に応じて設定項目を変更してください。


【作者】
さんごぱん(https://twitter.com/CordialBun)

【対応バージョン】
SRPG Studio version:1.310

【利用規約】
・利用はSRPG Studioを使ったゲームに限ります。
・商用、非商用問わず利用可能です。
・改変等、問題ありません。
・再配布OKです。ただしコメント文中に記載されている作者名は消さないでください。
・SRPG Studioの利用規約は遵守してください。

【更新履歴】
Ver.1.00 2025/04/05  初版


*----------------------------------------------------------------------------------------------------------------*/
(function () {
    /*-----------------------------------------------------------------------------------------------------------------
        設定項目
    *----------------------------------------------------------------------------------------------------------------*/
    StringTable.ItemWork_RemoveEquipment = "外す"; // コマンドの名称

    /*-----------------------------------------------------------------------------------------------------------------
        ゲーム起動時に画像データを読み込む
    *----------------------------------------------------------------------------------------------------------------*/
    var iconPic = null;

    var alias000 = SetupControl.setup;
    SetupControl.setup = function () {
        alias000.call(this);
        var baseList;

        if (iconPic == null) {
            baseList = root.getBaseData().getGraphicsResourceList(GraphicsType.ICON, true);
            iconPic = baseList.getCollectionData(1, 0);
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        「外す」コマンドの実装
    *----------------------------------------------------------------------------------------------------------------*/
    ItemSelectMenu._doWorkAction = function (workIndex) {
        var listIndex;
        var item = this._itemListWindow.getCurrentItem();
        var result = ItemSelectMenuResult.NONE;

        if (item.isWeapon()) {
            if (workIndex === 0) {
                listIndex = this._itemListWindow.getItemIndex();

                if (ItemControl.isEquip(this._unit) && listIndex === 0) {
                    ItemControl.removeEquippedWeapon(this._unit);
                } else {
                    ItemControl.setEquippedWeapon(this._unit, item);
                    this._resetItemList();
                }

                this._processMode(ItemSelectMenuMode.ITEMSELECT);
            } else if (workIndex === 1) {
                this._processMode(ItemSelectMenuMode.DISCARD);
            }
        } else {
            if (workIndex === 0) {
                result = ItemSelectMenuResult.USE;
            } else if (workIndex === 1) {
                this._processMode(ItemSelectMenuMode.DISCARD);
            }
        }

        return result;
    };

    var alias001 = ItemControl.setEquippedWeapon;
    ItemControl.setEquippedWeapon = function (unit, targetItem) {
        alias001.call(this, unit, targetItem);
        this.setEquip(unit, true);
    };

    ItemControl.removeEquippedWeapon = function (unit) {
        this.setEquip(unit, false);
    };

    ItemControl.isEquip = function (unit) {
        isEquip = unit.custom.isEquip;

        if (typeof isEquip !== "boolean") {
            unit.custom.isEquip = true;
            isEquip = unit.custom.isEquip;
        }

        return isEquip;
    };

    ItemControl.setEquip = function (unit, isEquip) {
        unit.custom.isEquip = isEquip;
    };

    ItemSelectMenu._moveItemSelect = function () {
        var index;
        var input = this._itemListWindow.moveWindow();
        var result = ItemSelectMenuResult.NONE;

        if (input === ScrollbarInput.SELECT) {
            index = this._itemListWindow.getItemIndex();
            this._itemWorkWindow.setItemWorkData(this._itemListWindow.getCurrentItem(), this._unit, index);
            this._processMode(ItemSelectMenuMode.WORK);
        } else if (input === ScrollbarInput.CANCEL) {
            ItemControl.updatePossessionItem(this._unit);
            result = ItemSelectMenuResult.CANCEL;
        } else {
            if (this._itemListWindow.isIndexChanged()) {
                this._itemInfoWindow.setInfoItem(this._itemListWindow.getCurrentItem());
            }
        }

        return result;
    };

    ItemWorkWindow.setItemWorkData = function (item, unit, index) {
        var arr;

        if (item.isWeapon()) {
            if (ItemControl.isEquip(unit) && index === 0) {
                arr = [StringTable.ItemWork_RemoveEquipment, StringTable.ItemWork_Discard];
            } else {
                arr = [StringTable.ItemWork_Equipment, StringTable.ItemWork_Discard];
            }

            this._scrollbar.setObjectArray(arr);
        } else {
            arr = [StringTable.ItemWork_Use, StringTable.ItemWork_Discard];
            this._scrollbar.setObjectArray(arr);
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ユニットがマップに登場した時点では武器は装備しているものとして扱う
    *----------------------------------------------------------------------------------------------------------------*/
    var alias002 = UnitProvider.setupFirstUnit;
    UnitProvider.setupFirstUnit = function (unit) {
        alias002.call(this, unit);
        ItemControl.setEquip(unit, true);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        拠点画面に入ったら武器は装備しているものとして扱う
    *----------------------------------------------------------------------------------------------------------------*/
    var alias003 = BattleResultSaveFlowEntry._recoveryPlayerList;
    BattleResultSaveFlowEntry._recoveryPlayerList = function () {
        alias003.call(this);
        var i, unit;
        var list = PlayerList.getMainList();
        var count = list.getCount();

        for (i = 0; i < count; i++) {
            unit = list.getData(i);
            ItemControl.setEquip(unit, true);
        }
    };
    /*-----------------------------------------------------------------------------------------------------------------
        装備中の武器の横にアイコンを表示する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias004 = ItemListScrollbar.drawScrollContent;
    ItemListScrollbar.drawScrollContent = function (x, y, object, isSelect, index) {
        alias004.call(this, x, y, object, isSelect, index);

        if (index === 0 && ItemControl.getEquippedWeapon(this._unit) !== null) {
            ItemRenderer.drawEquippedWeaponIcon(x, y);
        }
    };

    ItemRenderer.drawEquippedWeaponIcon = function (x, y) {
        var interval = this._getItemNumberInterval();
        var iconWidth = GraphicsFormat.ICON_WIDTH + 5;

        iconPic.drawParts(x + interval + iconWidth + 10, y, 24 * 4, 24 * 3, 24, 24);
    };

    var alias005 = WeaponSelectMenu._setWeaponFormation;
    WeaponSelectMenu._setWeaponFormation = function () {
        alias005.call(this);

        this._itemListWindow._scrollbar._unit = this._unit;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        武器を外しているとき、getEquippedWeaponはnullを返す
    *----------------------------------------------------------------------------------------------------------------*/
    var alias006 = ItemControl.getEquippedWeapon;
    ItemControl.getEquippedWeapon = function (unit) {
        var weapon = alias006.call(this, unit);

        if (unit === null) {
            return weapon;
        }

        if (!this.isEquip(unit)) {
            weapon = null;
        }

        return weapon;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        攻撃対象の選択に遷移したとき、武器を装備した扱いにする
    *----------------------------------------------------------------------------------------------------------------*/
    var alias007 = PosAttackWindow.setPosTarget;
    PosAttackWindow.setPosTarget = function (unit, item, targetUnit, targetItem, isSrc) {
        if (item !== null && item.isWeapon() && isSrc) {
            ItemControl.setEquip(unit, true);
        }

        alias007.call(this, unit, item, targetUnit, targetItem, isSrc);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        アイテム交換を実行したとき、装備可能な武器があるなら自動的に装備した扱いにする
    *----------------------------------------------------------------------------------------------------------------*/
    UnitItemTradeScreen._moveTradeSelect = function () {
        // アイテムを選択している状態で選択キーを押したか調べる
        if (this._isSelect) {
            if (!this._isTradable()) {
                this._playWarningSound();
                return MoveResult.CONTINUE;
            }

            // アイテムを入れ替える
            this._exchangeItem();

            // 入れ替えに伴いウインドウを更新
            this._updateListWindow();

            // 選択状態を解除する
            this._selectCancel();

            // アイテムの変更による更新を行う
            ItemControl.updatePossessionItem(this._unitSrc);
            ItemControl.updatePossessionItem(this._unitDest);

            // 武器を装備したものとして扱う
            ItemControl.setEquip(this._unitSrc, true);
            ItemControl.setEquip(this._unitDest, true);
        } else {
            // 選択した位置を保存
            this._selectIndex = this._getTargetIndex();

            // 選択したのは交換元か交換先かの保存
            this._isSrcSelect = this._isSrcScrollbarActive;

            // 選択状態に設定
            this._isSelect = true;

            // setForceSelectを呼び出すことで、選択した位置にカーソルが常に表示されるようにする
            if (this._isSrcSelect) {
                this._itemListSrc.setForceSelect(this._selectIndex);
            } else {
                this._itemListDest.setForceSelect(this._selectIndex);
            }
        }

        return MoveResult.CONTINUE;
    };
})();
