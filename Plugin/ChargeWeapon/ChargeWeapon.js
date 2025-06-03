/*-----------------------------------------------------------------------------------------------------------------

チャージ武器 Ver.1.01

※注意
本プラグインはウェイトターンシステムの拡張機能です。
ウェイトターンシステムとの併用を前提としており、単体では動作しません。

【概要】
チャージ武器は通常の武器と異なり、攻撃を行うために一定の溜め時間を必要とする武器です。

チャージ武器を装備しているユニットは、コマンド「チャージ（名称は任意で設定可能）」 を使用できるようになります。
チャージを使用するとユニットがチャージ状態になり、  
そのアタックターンの終了時に基本 WT 値の代わりに武器毎に設定したチャージタイム(CT)の値が WT 値に加算されます。

チャージ武器装備中は以下の条件を全て満たさない限り攻撃も反撃もできません。
・チャージ状態である
・チャージ使用時に加算されたチャージタイムが全て消費されている

チャージ状態のユニットは「攻撃」「チャージ解除（名称は任意で設定可能）」「待機」の3つ以外のコマンドを使用できなくなります。
チャージ状態はチャージ解除コマンドを使用するか、アイテム交換などで装備が変更されると解除されます。

チャージ武器は自軍だけでなく敵軍や同盟軍のユニットも使用できます。


【使い方】
下記のURLからマニュアルを参照してください。
https://github.com/CordialBun/srpg-studio-plugin/tree/master/ChargeWeapon#readme


【作者】
さんごぱん(https://twitter.com/CordialBun)

【対応バージョン】
SRPG Studio version:1.303

【利用規約】
・利用はSRPG Studioを使ったゲームに限ります。
・商用、非商用問わず利用可能です。
・改変等、問題ありません。
・再配布OKです。ただしコメント文中に記載されている作者名は消さないでください。
・SRPG Studioの利用規約は遵守してください。

【更新履歴】
Ver.1.00 2024/11/18 初版
Ver.1.01 2024/11/20 ディレイアタックの実装に伴い、コードを整理。


*----------------------------------------------------------------------------------------------------------------*/

/*-----------------------------------------------------------------------------------------------------------------
    設定項目
*----------------------------------------------------------------------------------------------------------------*/
// チャージタイムを表す文字列
var CHARGE_TIME_TEXT = "ＣＴ";

// チャージコマンドを上から何番目に表示するか(0が一番上)
var CHARGE_COMMAND_INDEX = 0;
// チャージ解除コマンドを上から何番目に表示するか(0が一番上)
var CHARGE_RELEASE_COMMAND_INDEX = 2;

// チャージステートのID
var ChargeStateId = {
    charge: 6, // chargeType:"charge"
    magic: 7 // chargeType:"magic"
};

// チャージコマンドの名称
var ChargeCommandNameString = {
    charge: "チャージ", // chargeType:"charge"
    magic: "詠唱" // chargeType:"magic"
};

// チャージ解除コマンドの名称
var ChargeReleaseCommandNameString = {
    charge: "解除", // chargeType:"charge"
    magic: "詠唱中断" // chargeType:"magic"
};

// チャージコマンドの確認メッセージ
var ChargeCommandMessageString = {
    charge: "チャージを開始しますか？", // chargeType:"charge"
    magic: "詠唱を開始しますか？" // chargeType:"magic"
};

// チャージ解除コマンドの確認メッセージ
var ChargeReleaseCommandMessageString = {
    charge: "チャージを解除しますか？", // chargeType:"charge"
    magic: "詠唱を中断しますか？" // chargeType:"magic"
};

// チャージ武器の情報ウィンドウに表示する文字列
var ChargeItemSentenceString = {
    charge: "チャージ武器", // chargeType:"charge"
    magic: "魔法武器" // chargeType:"magic"
};

(function () {
    /*-----------------------------------------------------------------------------------------------------------------
        ユニットコマンドを追加する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias000 = UnitCommand.configureCommands;
    UnitCommand.configureCommands = function (groupArray) {
        alias000.call(this, groupArray);

        groupArray.insertObject(UnitCommand.Charge, CHARGE_COMMAND_INDEX);
        groupArray.insertObject(UnitCommand.ReleaseCharge, CHARGE_RELEASE_COMMAND_INDEX);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ユニットコマンド「チャージ」
    *----------------------------------------------------------------------------------------------------------------*/
    UnitCommand.Charge = defineObject(UnitListCommand, {
        _unit: null,
        _pos: null,
        _mapX: 0,
        _mapY: 0,
        _weapon: null,
        _chargeType: -1,
        _state: null,
        _anime: null,
        _dynamicAnime: null,
        _questionWindow: null,
        _hasAnswered: false,
        isChargeCommand: true,

        openCommand: function () {
            this._prepareCommandMemberData();
            this._completeCommandMemberData();
        },

        moveCommand: function () {
            if (!this._hasAnswered && this._questionWindow.moveWindow() !== MoveResult.CONTINUE) {
                if (this._questionWindow.getQuestionAnswer() === QuestionAnswer.YES) {
                    this._hasAnswered = true;
                    this._questionWindow.enableWindow(false);
                    this._dynamicAnime.startDynamicAnime(this._anime, this._pos.x, this._pos.y);

                    return MoveResult.CONTINUE;
                }

                return MoveResult.END;
            }

            if (this._hasAnswered && this._moveAnime() !== MoveResult.CONTINUE) {
                return MoveResult.END;
            }

            return MoveResult.CONTINUE;
        },

        _moveAnime: function () {
            if (this._dynamicAnime.moveDynamicAnime() !== MoveResult.CONTINUE) {
                this.endCommandAction();

                return MoveResult.END;
            }

            return MoveResult.CONTINUE;
        },

        drawCommand: function () {
            var x = LayoutControl.getCenterX(-1, this._questionWindow.getWindowWidth());
            var y = LayoutControl.getCenterY(-1, this._questionWindow.getWindowHeight());

            this._questionWindow.drawWindow(x, y);

            if (this._hasAnswered) {
                this._dynamicAnime.drawDynamicAnime();
            }
        },

        _prepareCommandMemberData: function () {
            this._mapX = LayoutControl.getPixelX(this._unit.getMapX());
            this._mapY = LayoutControl.getPixelX(this._unit.getMapY());
            this._dynamicAnime = createObject(DynamicAnime);
            this._questionWindow = createWindowObject(QuestionWindow, this);
            this._questionWindow.setQuestionMessage(ChargeCommandMessageString[this._chargeType]);
            this._questionWindow.setQuestionActive(true);
            this._hasAnswered = false;
        },

        _completeCommandMemberData: function () {
            var stateList = root.getBaseData().getStateList();
            this._state = stateList.getDataFromId(ChargeStateId[this._chargeType]);
            this._anime = this._state.getEasyAnime();
            this._pos = LayoutControl.getMapAnimationPos(this._mapX, this._mapY, this._anime);

            this.changeCycleMode();
        },

        endCommandAction: function () {
            this._unit.custom.isCharging = true;
            StateControl.arrangeState(this._unit, this._state, IncreaseType.INCREASE);

            this._listCommandManager.endCommandAction(this);
        },

        isCommandDisplayable: function () {
            var result, chargeStateId, turnStateList, i, count, state;
            this._unit = this.getCommandTarget();
            this._weapon = ItemControl.getEquippedWeapon(this._unit);

            if (this._weapon === null) {
                return false;
            }

            this._chargeType = this._weapon.custom.chargeType;

            if (typeof this._chargeType !== "string") {
                return false;
            }

            chargeStateId = ChargeStateId[this._chargeType];
            result = true;
            turnStateList = this._unit.getTurnStateList();

            count = turnStateList.getCount();
            for (i = 0; i < count; i++) {
                state = turnStateList.getData(i).getState();

                if (state.getId() === chargeStateId) {
                    result = false;
                    break;
                }
            }

            return result;
        },

        isRepeatMoveAllowed: function () {
            return false;
        },

        getCommandName: function () {
            return ChargeCommandNameString[this._chargeType];
        }
    });

    /*-----------------------------------------------------------------------------------------------------------------
        ユニットコマンド「チャージ解除」
    *----------------------------------------------------------------------------------------------------------------*/
    UnitCommand.ReleaseCharge = defineObject(UnitCommand.Wait, {
        _unit: null,
        _weapon: null,
        _chargeType: -1,
        _state: null,
        isReleaseChargeCommand: true,

        openCommand: function () {
            this._prepareCommandMemberData();
            this._completeCommandMemberData();
        },

        moveCommand: function () {
            if (this._questionWindow.moveWindow() !== MoveResult.CONTINUE) {
                if (this._questionWindow.getQuestionAnswer() === QuestionAnswer.YES) {
                    this.endCommandAction();
                }

                return MoveResult.END;
            }

            return MoveResult.CONTINUE;
        },

        drawCommand: function () {
            var x = LayoutControl.getCenterX(-1, this._questionWindow.getWindowWidth());
            var y = LayoutControl.getCenterY(-1, this._questionWindow.getWindowHeight());

            this._questionWindow.drawWindow(x, y);
        },

        _prepareCommandMemberData: function () {
            this._questionWindow = createWindowObject(QuestionWindow, this);
            this._questionWindow.setQuestionMessage(ChargeReleaseCommandMessageString[this._chargeType]);
            this._questionWindow.setQuestionActive(true);
        },

        _completeCommandMemberData: function () {
            var stateList = root.getBaseData().getStateList();
            this._state = stateList.getDataFromId(ChargeStateId[this._chargeType]);

            this.changeCycleMode();
        },

        endCommandAction: function () {
            StateControl.arrangeState(this._unit, this._state, IncreaseType.DECREASE);

            delete this._unit.custom.isCharging;
            delete this._unit.custom.chargeWT;
            delete this._unit.custom.chargeWeaponId;
            delete this._unit.custom.chargeStartMapTotalWT;

            this._listCommandManager.endCommandAction(this);
        },

        isCommandDisplayable: function () {
            var i, count, result, chargeStateId, turnStateList, state;
            this._unit = this.getCommandTarget();
            this._weapon = ItemControl.getEquippedWeapon(this._unit);

            if (this._weapon === null) {
                return false;
            }

            this._chargeType = this._weapon.custom.chargeType;

            if (typeof this._chargeType !== "string") {
                return false;
            }

            chargeStateId = ChargeStateId[this._chargeType];
            result = false;
            turnStateList = this._unit.getTurnStateList();

            count = turnStateList.getCount();
            for (i = 0; i < count; i++) {
                state = turnStateList.getData(i).getState();

                if (state.getId() === chargeStateId) {
                    this._state = state;
                    result = true;
                    break;
                }
            }

            return result;
        },

        isRepeatMoveAllowed: function () {
            return false;
        },

        getCommandName: function () {
            return ChargeReleaseCommandNameString[this._chargeType];
        }
    });

    /*-----------------------------------------------------------------------------------------------------------------
        チャージ中は「攻撃」「チャージ解除」「待機」以外のコマンドは表示しない
    *----------------------------------------------------------------------------------------------------------------*/
    var alias001 = UnitCommand.Attack.isCommandDisplayable;
    UnitCommand.Attack.isCommandDisplayable = function () {
        var i, count, unit, weapon, chargeType, chargeStateId, turnStateList, state;
        var result = alias001.call(this);

        if (!result) {
            return result;
        }

        unit = this.getCommandTarget();
        weapon = ItemControl.getEquippedWeapon(unit);
        chargeType = weapon.custom.chargeType;

        if (typeof chargeType !== "string") {
            return result;
        }

        chargeStateId = ChargeStateId[chargeType];
        turnStateList = unit.getTurnStateList();
        count = turnStateList.getCount();
        for (i = 0; i < count; i++) {
            state = turnStateList.getData(i).getState();

            if (state.getId() === chargeStateId) {
                return true;
            }
        }

        return false;
    };

    UnitListCommand.isCommandDisplayableWithChargeState = function (unit) {
        var i, state, isChargeState;
        var turnStateList = unit.getTurnStateList();
        var count = turnStateList.getCount();

        for (i = 0; i < count; i++) {
            state = turnStateList.getData(i).getState();
            isChargeState = state.custom.isChargeState;

            if (typeof isChargeState === "boolean" && isChargeState) {
                return false;
            }
        }

        return true;
    };

    var alias002 = UnitCommand.PlaceCommand.isCommandDisplayable;
    UnitCommand.PlaceCommand.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias002.call(this);
    };

    var alias003 = UnitCommand.Occupation.isCommandDisplayable;
    UnitCommand.Occupation.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias003.call(this);
    };

    var alias004 = UnitCommand.Treasure.isCommandDisplayable;
    UnitCommand.Treasure.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias004.call(this);
    };

    var alias005 = UnitCommand.Village.isCommandDisplayable;
    UnitCommand.Village.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias005.call(this);
    };

    var alias006 = UnitCommand.Shop.isCommandDisplayable;
    UnitCommand.Shop.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias006.call(this);
    };

    var alias007 = UnitCommand.Gate.isCommandDisplayable;
    UnitCommand.Gate.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias007.call(this);
    };

    var alias008 = UnitCommand.Quick.isCommandDisplayable;
    UnitCommand.Quick.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias008.call(this);
    };

    var alias009 = UnitCommand.Steal.isCommandDisplayable;
    UnitCommand.Steal.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias009.call(this);
    };

    var alias010 = UnitCommand.Wand.isCommandDisplayable;
    UnitCommand.Wand.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias010.call(this);
    };

    var alias011 = UnitCommand.Information.isCommandDisplayable;
    UnitCommand.Information.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias011.call(this);
    };

    var alias012 = UnitCommand.Item.isCommandDisplayable;
    UnitCommand.Item.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias012.call(this);
    };

    var alias013 = UnitCommand.Trade.isCommandDisplayable;
    UnitCommand.Trade.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias013.call(this);
    };

    var alias014 = UnitCommand.Stock.isCommandDisplayable;
    UnitCommand.Stock.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias014.call(this);
    };

    var alias015 = UnitCommand.MetamorphozeCancel.isCommandDisplayable;
    UnitCommand.MetamorphozeCancel.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias015.call(this);
    };

    var alias016 = UnitCommand.UnitEvent.isCommandDisplayable;
    UnitCommand.UnitEvent.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias016.call(this);
    };

    var alias017 = UnitCommand.Talk.isCommandDisplayable;
    UnitCommand.Talk.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias017.call(this);
    };

    var alias018 = UnitCommand.FusionAttack.isCommandDisplayable;
    UnitCommand.FusionAttack.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias018.call(this);
    };

    var alias019 = UnitCommand.FusionCatch.isCommandDisplayable;
    UnitCommand.FusionCatch.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias019.call(this);
    };

    var alias020 = UnitCommand.FusionUnitTrade.isCommandDisplayable;
    UnitCommand.FusionUnitTrade.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias020.call(this);
    };

    var alias021 = UnitCommand.FusionRelease.isCommandDisplayable;
    UnitCommand.FusionRelease.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias021.call(this);
    };

    var alias022 = UnitCommand.FusionUnitTrade.isCommandDisplayable;
    UnitCommand.FusionUnitTrade.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias022.call(this);
    };

    var alias023 = UnitCommand.Metamorphoze.isCommandDisplayable;
    UnitCommand.Metamorphoze.isCommandDisplayable = function () {
        if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
            return false;
        }

        return alias023.call(this);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        チャージ状態のユニットの移動力は0として扱う
    *----------------------------------------------------------------------------------------------------------------*/

    var alias024 = ParamBonus.getMov;
    ParamBonus.getMov = function (unit) {
        var i, state, isChargeState;
        var mov = alias024.call(this, unit);
        var turnStateList = unit.getTurnStateList();
        var count = turnStateList.getCount();

        for (i = 0; i < count; i++) {
            state = turnStateList.getData(i).getState();
            isChargeState = state.custom.isChargeState;

            if (typeof isChargeState === "boolean" && isChargeState) {
                return 0;
            }
        }

        return mov;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        チャージ中は攻撃時に武器選択画面を開かない
    *----------------------------------------------------------------------------------------------------------------*/
    var alias025 = UnitCommand.Attack._prepareCommandMemberData;
    UnitCommand.Attack._prepareCommandMemberData = function () {
        alias025.call(this);
        var unit = this.getCommandTarget();
        var isCharging = unit.custom.isCharging;

        if (typeof isCharging === "boolean" && isCharging) {
            this._isWeaponSelectDisabled = true;
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        攻撃後にチャージ状態を解除し、チャージ関連のカスパラを削除する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias026 = CoreAttack._startCommonAttack;
    CoreAttack._startCommonAttack = function (attackInfo, attackOrder) {
        alias026.call(this, attackInfo, attackOrder);
        var i, attackEntry, unit, weapon, isCharging, stateList, state;
        var count = attackOrder.getEntryCount();
        var attackEntryArray = attackOrder.getAttackEntryArray();

        for (i = 0; i < count; i++) {
            attackEntry = attackEntryArray[i];

            if (attackEntry.isSrc) {
                unit = attackInfo.unitSrc;
            } else {
                unit = attackInfo.unitDest;
            }

            weapon = ItemControl.getEquippedWeapon(unit);
            isCharging = unit.custom.isCharging;

            if (weapon === null || typeof weapon.custom.chargeType !== "string" || typeof isCharging !== "boolean" || !isCharging) {
                continue;
            }

            stateList = root.getBaseData().getStateList();
            state = stateList.getDataFromId(ChargeStateId[weapon.custom.chargeType]);
            StateControl.arrangeState(unit, state, IncreaseType.DECREASE);

            delete unit.custom.isCharging;
            delete unit.custom.chargeWT;
            delete unit.custom.chargeWeaponId;
            delete unit.custom.chargeStartMapTotalWT;
        }
    };

    AttackOrder.getAttackEntryArray = function () {
        return this._attackEntryArray;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        チャージ中に装備が変更されたときにチャージ状態を解除し、チャージ関連のカスパラを削除する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias027 = ItemControl.updatePossessionItem;
    ItemControl.updatePossessionItem = function (unit) {
        alias027.call(this, unit);
        var i, count, isCharging, chargeWeaponId, chargeType, turnStateList, stateList, state, isChargeState;
        var weapon = ItemControl.getEquippedWeapon(unit);

        if (weapon === null) {
            isCharging = unit.custom.isCharging;

            if (typeof isCharging === "boolean" && isCharging) {
                turnStateList = unit.getTurnStateList();

                count = turnStateList.getCount();
                for (i = 0; i < count; i++) {
                    state = turnStateList.getData(i).getState();
                    isChargeState = state.custom.isChargeState;

                    if (typeof isChargeState === "boolean" && isChargeState) {
                        StateControl.arrangeState(unit, state, IncreaseType.DECREASE);
                    }
                }

                delete unit.custom.isCharging;
                delete unit.custom.chargeWT;
                delete unit.custom.chargeWeaponId;
                delete unit.custom.chargeStartMapTotalWT;
            }

            return;
        }

        chargeWeaponId = unit.custom.chargeWeaponId;
        chargeType = weapon.custom.chargeType;

        if (typeof chargeWeaponId !== "number" || typeof chargeType !== "string" || chargeWeaponId === weapon.getId()) {
            return;
        }

        stateList = root.getBaseData().getStateList();
        state = stateList.getDataFromId(ChargeStateId[chargeType]);
        StateControl.arrangeState(unit, state, IncreaseType.DECREASE);

        delete unit.custom.isCharging;
        delete unit.custom.chargeWT;
        delete unit.custom.chargeWeaponId;
        delete unit.custom.chargeStartMapTotalWT;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        チャージ武器を装備しているユニットはチャージが完了しているときのみ反撃できる
    *----------------------------------------------------------------------------------------------------------------*/
    var alias028 = VirtualAttackControl._calculateAttackAndRoundCount;
    VirtualAttackControl._calculateAttackAndRoundCount = function (virtualAttackUnit, isAttack, targetUnit) {
        alias028.call(this, virtualAttackUnit, isAttack, targetUnit);
        var i, count, unit, weapon, chargeType, chargeWT, turnStateList, state, chargeStateExists, chargeStartMapTotalWT, mapTotalWT;

        if (!isAttack) {
            return;
        }

        weapon = virtualAttackUnit.weapon;
        chargeType = weapon.custom.chargeType;
        chargeWT = weapon.custom.chargeWT;

        if (typeof chargeType !== "string" || typeof chargeWT !== "number") {
            return;
        }

        unit = virtualAttackUnit.unitSelf;
        turnStateList = unit.getTurnStateList();
        chargeStateExists = false;

        count = turnStateList.getCount();
        for (i = 0; i < count; i++) {
            state = turnStateList.getData(i).getState();

            if (state.getId() === ChargeStateId[chargeType]) {
                chargeStateExists = true;
                break;
            }
        }

        if (chargeStateExists) {
            chargeStartMapTotalWT = unit.custom.chargeStartMapTotalWT;
            mapTotalWT = WaitTurnOrderManager.getMapTotalWT();

            if (mapTotalWT >= chargeStartMapTotalWT + chargeWT) {
                virtualAttackUnit.attackCount = Calculator.calculateAttackCount(virtualAttackUnit.unitSelf, targetUnit, weapon);
                virtualAttackUnit.roundCount = Calculator.calculateRoundCount(virtualAttackUnit.unitSelf, targetUnit, weapon);
            } else {
                virtualAttackUnit.attackCount = 0;
                virtualAttackUnit.roundCount = 0;
            }
        } else {
            virtualAttackUnit.attackCount = 0;
            virtualAttackUnit.roundCount = 0;
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        チャージ武器装備中でかつチャージが完了していないユニットの攻撃・命中・必殺を空欄にする
    *----------------------------------------------------------------------------------------------------------------*/
    var alias029 = AttackChecker.getAttackStatusInternal;
    AttackChecker.getAttackStatusInternal = function (unit, weapon, targetUnit) {
        var i, count, unit, weapon, chargeType, chargeWT, turnStateList, state, chargeStateExists, chargeStartMapTotalWT, mapTotalWT;
        var arr = alias029.call(this, unit, weapon, targetUnit);

        if (weapon === null) {
            return arr;
        }

        chargeType = weapon.custom.chargeType;
        chargeWT = weapon.custom.chargeWT;

        if (typeof chargeType !== "string" || typeof chargeWT !== "number") {
            return arr;
        }

        turnStateList = unit.getTurnStateList();
        chargeStateExists = false;

        count = turnStateList.getCount();
        for (i = 0; i < count; i++) {
            state = turnStateList.getData(i).getState();

            if (state.getId() === ChargeStateId[chargeType]) {
                chargeStateExists = true;
                break;
            }
        }

        if (chargeStateExists) {
            chargeStartMapTotalWT = unit.custom.chargeStartMapTotalWT;
            mapTotalWT = WaitTurnOrderManager.getMapTotalWT();

            if (mapTotalWT >= chargeStartMapTotalWT + chargeWT) {
                return arr;
            } else {
                return [, , ,];
            }
        } else {
            return [, , ,];
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        チャージ武器持ちの敵用のカスタム行動パターン
    *----------------------------------------------------------------------------------------------------------------*/
    var alias030 = AutoActionBuilder.buildApproachAction;
    AutoActionBuilder.buildApproachAction = function (unit, autoActionArray) {
        var i, count, isChargeState, turnStateList, state;
        var result = alias030.call(this, unit, autoActionArray);
        var isChargeKept = unit.custom.isChargeKept;

        // this._buildEmptyActionが呼ばれてresultがfalseになっているとき、
        // つまり攻撃可能な相手がいないときのみ以降の処理を行う
        if (result || typeof isChargeKept !== "boolean" || isChargeKept) {
            return result;
        }

        isChargeState = false;
        turnStateList = unit.getTurnStateList();
        count = turnStateList.getCount();

        for (i = 0; i < count; i++) {
            state = turnStateList.getData(i).getState();

            if (typeof state.custom.isChargeState === "boolean" && state.custom.isChargeState) {
                isChargeState = true;
            }
        }

        if (isChargeState) {
            this._pushReleaseCharge(unit, autoActionArray, null);
            return true;
        }
    };

    var alias031 = AutoActionBuilder.buildMoveAction;
    AutoActionBuilder.buildMoveAction = function (unit, autoActionArray) {
        var i, count, isChargeState, turnStateList, state;
        var result = alias031.call(this, unit, autoActionArray);
        var isChargeKept = unit.custom.isChargeKept;

        // this._buildEmptyActionが呼ばれてresultがfalseになっているとき、
        // つまり攻撃可能な相手がいないときのみ以降の処理を行う
        if (result || typeof isChargeKept !== "boolean" || isChargeKept) {
            return result;
        }

        isChargeState = false;
        turnStateList = unit.getTurnStateList();
        count = turnStateList.getCount();

        for (i = 0; i < count; i++) {
            state = turnStateList.getData(i).getState();

            if (typeof state.custom.isChargeState === "boolean" && state.custom.isChargeState) {
                isChargeState = true;
            }
        }

        if (isChargeState) {
            this._pushReleaseCharge(unit, autoActionArray, null);
            return true;
        }
    };

    var alias032 = AutoActionBuilder.buildWaitAction;
    AutoActionBuilder.buildWaitAction = function (unit, autoActionArray) {
        var i, count, isChargeState, turnStateList, state;
        var result = alias032.call(this, unit, autoActionArray);
        var isChargeKept = unit.custom.isChargeKept;

        // this._buildEmptyActionが呼ばれてresultがfalseになっているとき、
        // つまり攻撃可能な相手がいないときのみ以降の処理を行う
        if (result || typeof isChargeKept !== "boolean" || isChargeKept) {
            return result;
        }

        isChargeState = false;
        turnStateList = unit.getTurnStateList();
        count = turnStateList.getCount();

        for (i = 0; i < count; i++) {
            state = turnStateList.getData(i).getState();

            if (typeof state.custom.isChargeState === "boolean" && state.custom.isChargeState) {
                isChargeState = true;
            }
        }

        if (isChargeState) {
            this._pushReleaseCharge(unit, autoActionArray, null);
            return true;
        }
    };

    var alias033 = AutoActionBuilder._pushGeneral;
    AutoActionBuilder._pushGeneral = function (unit, autoActionArray, combination) {
        var i, count, weapon, chargeType, isChargeState, turnStateList, state;

        if (combination.item === null || !combination.item.isWeapon()) {
            alias033.call(this, unit, autoActionArray, combination);
            return;
        }

        weapon = combination.item;
        chargeType = weapon.custom.chargeType;

        if (typeof chargeType !== "string") {
            alias033.call(this, unit, autoActionArray, combination);
            return;
        }

        isChargeState = false;
        turnStateList = unit.getTurnStateList();
        count = turnStateList.getCount();

        for (i = 0; i < count; i++) {
            state = turnStateList.getData(i).getState();

            if (typeof state.custom.isChargeState === "boolean" && state.custom.isChargeState) {
                isChargeState = true;
            }
        }

        this._pushMove(unit, autoActionArray, combination);

        if (isChargeState) {
            this._pushAttack(unit, autoActionArray, combination);
        } else {
            this._pushCharge(unit, autoActionArray, combination);
        }
    };

    AutoActionBuilder._pushCharge = function (unit, autoActionArray, combination) {
        var autoAction = createObject(ChargeAutoAction);

        autoAction.setAutoActionInfo(unit, combination);
        autoActionArray.push(autoAction);
    };

    AutoActionBuilder._pushReleaseCharge = function (unit, autoActionArray, combination) {
        var autoAction = createObject(ReleaseChargeAutoAction);

        autoAction.setAutoActionInfo(unit, combination);
        autoActionArray.push(autoAction);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        チャージのAutoAction
    *----------------------------------------------------------------------------------------------------------------*/
    var ChargeAutoActionMode = {
        CURSORSHOW: 0,
        ANIME: 1
    };

    var ChargeAutoAction = defineObject(BaseAutoAction, {
        _unit: null,
        _chargeWT: null,
        _chargeWeaponId: null,
        _chargeStartMapTotalWT: null,
        _mapX: null,
        _mapY: null,
        _state: null,
        _anime: null,
        _dynamicAnime: null,
        _pos: null,
        _autoActionCursor: null,
        isChargeAction: null,

        setAutoActionInfo: function (unit, combination) {
            var weapon = ItemControl.getEquippedWeapon(unit);
            var mapInfo = root.getCurrentSession().getCurrentMapInfo();
            var width = mapInfo.getMapWidth();
            var posIndex = combination.posIndex;

            this._mapX = LayoutControl.getPixelX(posIndex % width);
            this._mapY = LayoutControl.getPixelX(Math.floor(posIndex / width));
            this._unit = unit;
            this._chargeStartMapTotalWT = WaitTurnOrderManager.getMapTotalWT();

            if (weapon !== null) {
                this._chargeWeaponId = weapon.getId();

                if (typeof weapon.custom.chargeWT === "number") {
                    this._chargeWT = weapon.custom.chargeWT;
                }

                if (typeof weapon.custom.chargeType === "string") {
                    this._state = root.getBaseData().getStateList().getDataFromId(ChargeStateId[weapon.custom.chargeType]);
                }
            }

            this._anime = this._state.getEasyAnime();
            this._dynamicAnime = createObject(DynamicAnime);
            this._pos = LayoutControl.getMapAnimationPos(this._mapX, this._mapY, this._anime);
            this._autoActionCursor = createObject(AutoActionCursor);
            this.isChargeAction = true;
        },

        enterAutoAction: function () {
            var isSkipMode = this.isSkipMode();

            if (isSkipMode) {
                this.changeCycleMode(ChargeAutoActionMode.ANIME);
            } else {
                this._autoActionCursor.setAutoActionPos(this._unit.getMapX(), this._unit.getMapY(), true);
                this.changeCycleMode(ChargeAutoActionMode.CURSORSHOW);
            }

            this._dynamicAnime.startDynamicAnime(this._anime, this._pos.x, this._pos.y);

            return EnterResult.OK;
        },

        moveAutoAction: function () {
            var result = MoveResult.CONTINUE;
            var mode = this.getCycleMode();

            if (mode === ChargeAutoActionMode.CURSORSHOW) {
                result = this._moveCursorShow();
            } else if (mode === ChargeAutoActionMode.ANIME) {
                result = this._dynamicAnime.moveDynamicAnime();
            }

            if (result === MoveResult.END) {
                if (typeof this._chargeWT === "number" && typeof this._chargeWeaponId === "number" && this._state !== null) {
                    this._unit.custom.isCharging = true;
                    this._unit.custom.hasCharged = true;
                    this._unit.custom.chargeWT = this._chargeWT;
                    this._unit.custom.chargeWeaponId = this._chargeWeaponId;
                    this._unit.custom.chargeStartMapTotalWT = this._chargeStartMapTotalWT;
                    StateControl.arrangeState(this._unit, this._state, IncreaseType.INCREASE);
                }
            }

            return result;
        },

        _moveCursorShow: function () {
            if (this._autoActionCursor.moveAutoActionCursor() !== MoveResult.CONTINUE) {
                this.changeCycleMode(ChargeAutoActionMode.ANIME);
            }

            return MoveResult.CONTINUE;
        },

        drawAutoAction: function () {
            var mode = this.getCycleMode();

            if (mode === ChargeAutoActionMode.CURSORSHOW) {
                this._drawCursorShow();
            } else if (mode === ChargeAutoActionMode.ANIME) {
                this._dynamicAnime.drawDynamicAnime();
            }
        },

        _drawCursorShow: function () {
            this._autoActionCursor.drawAutoActionCursor();
        }
    });

    /*-----------------------------------------------------------------------------------------------------------------
        チャージ解除のAutoAction
    *----------------------------------------------------------------------------------------------------------------*/
    var ReleaseChargeAutoActionMode = {
        CURSORSHOW: 0,
        RELEASE: 1
    };

    var ReleaseChargeAutoAction = defineObject(BaseAutoAction, {
        _unit: null,
        _state: null,
        _autoActionCursor: null,

        setAutoActionInfo: function (unit, combination) {
            var weapon = ItemControl.getEquippedWeapon(unit);

            if (weapon !== null && typeof weapon.custom.chargeType === "string") {
                this._state = root.getBaseData().getStateList().getDataFromId(ChargeStateId[weapon.custom.chargeType]);
            }

            this._unit = unit;
            this._autoActionCursor = createObject(AutoActionCursor);
        },

        enterAutoAction: function () {
            var isSkipMode = this.isSkipMode();

            if (isSkipMode) {
                this.changeCycleMode(ReleaseChargeAutoActionMode.RELEASE);
            } else {
                this._autoActionCursor.setAutoActionPos(this._unit.getMapX(), this._unit.getMapY(), true);
                this.changeCycleMode(ReleaseChargeAutoActionMode.CURSORSHOW);
            }

            return EnterResult.OK;
        },

        moveAutoAction: function () {
            var result = MoveResult.CONTINUE;
            var mode = this.getCycleMode();

            if (mode === ReleaseChargeAutoActionMode.CURSORSHOW) {
                result = this._moveCursorShow();
            } else if (mode === ReleaseChargeAutoActionMode.RELEASE) {
                if (this._state !== null) {
                    StateControl.arrangeState(this._unit, this._state, IncreaseType.DECREASE);
                }

                delete this._unit.custom.isCharging;
                delete this._unit.custom.chargeWT;
                delete this._unit.custom.chargeWeaponId;
                delete this._unit.custom.chargeStartMapTotalWT;

                result = MoveResult.END;
            }

            return result;
        },

        _moveCursorShow: function () {
            if (this._autoActionCursor.moveAutoActionCursor() !== MoveResult.CONTINUE) {
                this.changeCycleMode(ReleaseChargeAutoActionMode.RELEASE);
            }

            return MoveResult.CONTINUE;
        },

        drawAutoAction: function () {
            var mode = this.getCycleMode();

            if (mode === ReleaseChargeAutoActionMode.CURSORSHOW) {
                this._drawCursorShow();
            }
        },

        _drawCursorShow: function () {
            this._autoActionCursor.drawAutoActionCursor();
        }
    });
})();
