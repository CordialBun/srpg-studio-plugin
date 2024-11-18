/*-----------------------------------------------------------------------------------------------------------------

「ウェイトターンシステム」 Ver.2.00

【概要】
ウェイトターンシステムは、ユニットの速さや所持アイテムの重量などから算出される待機時間(ウェイトターン)によって
ユニットの行動順が決まる非交互ターン制のシステムです。

従来の交互ターン制と違い、自軍フェイズや敵軍フェイズといった概念がなく、
ウェイトターン(WT)が0になったユニットから順に所属に関係なく行動できます。

本プラグインを導入することでウェイトターンシステムを実現できます。


【使い方】
下記のURLからマニュアルを参照してください。
https://github.com/CordialBun/srpg-studio-plugin/tree/master/WaitTurnSystem#readme


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
Ver.1.00 2024/3/23  初版
Ver.1.10 2024/3/24  現在のマップの合計WT値を取得する機能を追加。
                    オープニングイベントに特定のイベントコマンドがあるとエラー落ちする不具合を修正。
                    行動終了後に加算されるWT値を計算するとき、小数点以下を切り捨てる処理がされていなかった不具合を修正。
Ver.1.20 2024/11/04 行動終了後に加算されるWT値の計算式を変更。
                    重量計算で所持アイテム全てを参照するか装備武器のみ参照するか選択できる機能を追加。
                    行動順リストの表示位置を画面右か画面下か選択できる機能を追加。
                    マップ上のATユニットにアイコンを表示する機能を追加。
                    マップ上でA/Sキーを押すとユニットの行動順にマップカーソルが遷移する機能を追加。
                    ユニットメニューにWTの表示を追加。
                    各種文字列の設定項目を追加。
                    出撃準備画面で出撃ユニットを変更すると、変更後のユニットのWTが算出されない不具合を修正。
                    出撃準備画面でアイテム交換やストック交換をするとWTが正常に反映されない不具合を修正。
                    自軍ユニットが待機後、次のATユニットが自軍ユニットのときに効果音が二重に再生されてしまう不具合を修正。
Ver.1.21 2024/11/04 WT値が同じユニットがいるときにエラー落ちする不具合を修正。
Ver.1.22 2024/11/11 マニュアルを作成。
                    ユニットの登場や援軍で増えたユニットが行動順リストに正常に反映されない不具合を修正。
Ver.2.00 2024/11/18 拡張機能「チャージ武器」を追加。
                    ユニットの移動範囲や攻撃範囲、危険範囲の描画が行動順リストに重ならないよう仕様を変更。
                    ユニットが画面右端または画面下端付近にいるとき、ユニットコマンドが行動順リストと重なってしまう不具合を修正。


*----------------------------------------------------------------------------------------------------------------*/

/*-----------------------------------------------------------------------------------------------------------------
    設定項目
*----------------------------------------------------------------------------------------------------------------*/
// 重量計算でユニットの所持アイテム全てを参照する場合はtrue、装備武器のみ参照する場合はfalse
var IS_ALL_BELONGINGS_APPLICABLE = true;

// 行動順リストを画面右に表示する場合はtrue、画面下に表示する場合はfalse
var IS_WT_ORDER_LIST_LOCATED_RIGHT = true;

// 行動順リストの描画に関するパラメータ
var WaitTurnOrderParam = {
    RIGHT_ORDER_LIST_START_POS_X: 10, // 行動順リストの開始位置のx座標(画面右に表示するときに使用)
    RIGHT_ORDER_LIST_START_POS_Y: 0, // 行動順リストの開始位置のy座標(画面右に表示するときに使用)
    BOTTOM_ORDER_LIST_START_POS_X: 0, // 行動順リストの開始位置のx座標(画面下に表示するときに使用)
    BOTTOM_ORDER_LIST_START_POS_Y: 10, // 行動順リストの開始位置のy座標(画面下に表示するときに使用)
    ORDER_LIST_UNIT_NUM: 15 // 行動順リストのユニット表示数
};

// 目標確認画面やセーブ・ロード画面で表示する経過WTの項目名
StringTable.Signal_TotalWT = "経過WT";

/*-----------------------------------------------------------------------------------------------------------------
    行動順リストを管理するオブジェクト
*----------------------------------------------------------------------------------------------------------------*/
var WaitTurnOrderManager = {
    _unitList: null,
    _orderList: null,

    // 初期化
    initialize: function () {
        this.update(true, false);
    },

    // アタックターン終了時
    attackTurnEnd: function () {
        var atUnit = this.getATUnit();

        this.setNextWT(atUnit);
        this.initPredictParam(atUnit);
        this.update(false, true);
    },

    // ロード時など、curWTはそのままでリストを再構築したいときに呼ぶ
    rebuildList: function () {
        this.update(false, false);
    },

    // ユニットリストと行動順リストを更新する
    update: function (isInitialize, isAttackTurnEnd) {
        var i, j, count, unit, atUnit, atCurWT, totalWT, defaultWT, obj, curMapInfo;
        var playerList = PlayerList.getSortieList();
        var enemyList = EnemyList.getAliveList();
        var allyList = AllyList.getAliveList();
        var allUnitList = [];

        count = playerList.getCount();
        for (i = 0; i < count; i++) {
            unit = playerList.getData(i);

            if (isInitialize) {
                this.initUnitParam(unit);
            }

            if (typeof unit.custom.curWT === "number") {
                allUnitList.push(unit);
            }
        }

        count = enemyList.getCount();
        for (i = 0; i < count; i++) {
            unit = enemyList.getData(i);

            if (isInitialize) {
                this.initUnitParam(unit);
            }

            if (typeof unit.custom.curWT === "number") {
                allUnitList.push(unit);
            }
        }

        count = allyList.getCount();
        for (i = 0; i < count; i++) {
            unit = allyList.getData(i);

            if (isInitialize) {
                this.initUnitParam(unit);
            }

            if (typeof unit.custom.curWT === "number") {
                allUnitList.push(unit);
            }
        }

        this._unitList = allUnitList.sort(function (prevUnit, nextUnit) {
            if (prevUnit.custom.curWT < nextUnit.custom.curWT) {
                return -1;
            } else if (prevUnit.custom.curWT > nextUnit.custom.curWT) {
                return 1;
            } else {
                if (prevUnit.getUnitType() < nextUnit.getUnitType()) {
                    return -1;
                } else if (prevUnit.getUnitType() > nextUnit.getUnitType()) {
                    return 1;
                } else {
                    if (prevUnit.getId() < nextUnit.getId()) {
                        return -1;
                    } else if (prevUnit.getId() > nextUnit.getId()) {
                        return 1;
                    }
                }
            }
            return 0;
        });
        this._orderList = [];

        atUnit = this._unitList[0];
        atUnit.custom.isAT = true;
        atCurWT = atUnit.custom.curWT;

        if (isAttackTurnEnd) {
            atUnit.custom.atCount += 1;
            totalWT = this.getMapTotalWT();

            if (totalWT < 0) {
                totalWT = 0;
            }

            this.setMapTotalWT(totalWT + atCurWT);
        }

        count = this._unitList.length;

        for (i = 0; i < count; i++) {
            unit = this._unitList[i];

            if (isAttackTurnEnd) {
                unit.custom.curWT -= atCurWT;
            }

            if (i > 0) {
                delete unit.custom.isAT;
            }

            defaultWT = this.calcUnitWT(unit);

            for (j = 0; j < WaitTurnOrderParam.ORDER_LIST_UNIT_NUM; j++) {
                this._orderList.push({
                    unit: unit,
                    wt: unit.custom.curWT + defaultWT * j,
                    isTop: j === 0
                });
            }
        }

        this._orderList = this._orderList.sort(function (prevObj, nextObj) {
            if (prevObj.wt < nextObj.wt) {
                return -1;
            } else if (prevObj.wt > nextObj.wt) {
                return 1;
            } else {
                if (prevObj.unit.getUnitType() < nextObj.unit.getUnitType()) {
                    return -1;
                } else if (prevObj.unit.getUnitType() > nextObj.unit.getUnitType()) {
                    return 1;
                } else {
                    if (prevObj.unit.getId() < nextObj.unit.getId()) {
                        return -1;
                    } else if (prevObj.unit.getId() > nextObj.unit.getId()) {
                        return 1;
                    }
                }
            }
            return 0;
        });

        count = this._orderList.length;

        for (i = 0; i < count; i++) {
            obj = this._orderList[i];

            if (obj.isTop) {
                obj.unit.custom.orderNum = i + 1;
            }
        }
    },

    // ユニットリストを取得する
    getUnitList: function () {
        return this._unitList;
    },

    // 行動順リストを取得する
    getOrderList: function () {
        return this._orderList;
    },

    // isTopがtrueのオブジェクトのみを含む行動順リストを取得する
    getOrderTopList: function () {
        var i, obj;
        var orderList = this.getOrderList();
        var orderTopList = [];
        var count = orderList.length;

        for (i = 0; i < count; i++) {
            obj = orderList[i];

            if (obj.isTop) {
                orderTopList.push(obj);
            }
        }

        return orderTopList;
    },

    // ATユニットがとろうとしている行動内容に応じて予測行動順リストを取得する
    getPredictOrderList: function (atUnit) {
        var sumWT, i, count, obj, unit;
        var predictOrderList = [];
        var pushCount = 0;

        if (atUnit == null || typeof atUnit.custom.curWT !== "number") {
            return null;
        }

        sumWT = atUnit.custom.curWT;

        count = this._orderList.length;
        for (i = 0; i < count; i++) {
            obj = this._orderList[i];
            unit = obj.unit;

            if (unit.getId() !== atUnit.getId()) {
                predictOrderList.push(obj);
                pushCount++;

                if (pushCount === WaitTurnOrderParam.ORDER_LIST_UNIT_NUM) {
                    break;
                }
            }
        }

        count = WaitTurnOrderParam.ORDER_LIST_UNIT_NUM;
        for (i = 0; i < count; i++) {
            predictOrderList.push({
                unit: atUnit,
                wt: sumWT,
                isTop: i === 0
            });

            sumWT += i === 0 ? this.calcNextWT(atUnit) : this.calcUnitWT(unit);
        }

        predictOrderList = predictOrderList.sort(function (prevObj, nextObj) {
            if (prevObj.wt < nextObj.wt) {
                return -1;
            } else if (prevObj.wt > nextObj.wt) {
                return 1;
            } else {
                if (prevObj.unit.getUnitType() < nextObj.unit.getUnitType()) {
                    return -1;
                } else if (prevObj.unit.getUnitType() > nextObj.unit.getUnitType()) {
                    return 1;
                } else {
                    if (prevObj.unit.getId() < nextObj.unit.getId()) {
                        return -1;
                    } else if (prevObj.unit.getId() > nextObj.unit.getId()) {
                        return 1;
                    }
                }
            }
            return 0;
        });

        return predictOrderList;
    },

    // ATユニットを取得する
    getATUnit: function () {
        if (this._unitList === null || this._unitList.length === 0) {
            return null;
        }

        return this._unitList[0];
    },

    // ATユニットの所属を取得する
    getATUnitType: function () {
        var atUnit = this.getATUnit();

        if (atUnit === null) {
            return UnitType.PLAYER;
        }

        return atUnit.getUnitType();
    },

    // 指定したユニットに新たにWT値を加算する
    setNextWT: function (unit) {
        if (unit === null) {
            return;
        }

        unit.custom.curWT = this.calcNextWT(unit);
    },

    // ユニットのカスパラを初期化する
    initUnitParam: function (unit) {
        if (unit === null) {
            return;
        }

        unit.custom.curWT = this.calcUnitWT(unit);
        unit.custom.orderNum = 0;
        unit.custom.atCount = 0;
    },

    // 次に加算するWT値を計算する
    calcNextWT: function (unit) {
        var nextWT = this.calcUnitWT(unit);
        var hasCharged = unit.custom.hasCharged;
        var chargeWT = unit.custom.chargeWT;

        if (typeof hasCharged === "boolean" && typeof chargeWT === "number" && hasCharged) {
            return Math.max(chargeWT, 0);
        }

        return nextWT;
    },

    // ユニットの基本WT値を計算する
    calcUnitWT: function (unit) {
        var unitClass, classWT, defaultWT, spd, i, count, item;
        var totalWeight = 0;

        if (unit === null) {
            return 0;
        }

        unitClass = unit.getClass();

        if (typeof unitClass.custom.classWT !== "number" || unitClass.custom.classWT < 0) {
            classWT = 0;
        } else {
            classWT = unitClass.custom.classWT;
        }

        spd = RealBonus.getSpd(unit);

        if (IS_ALL_BELONGINGS_APPLICABLE) {
            // 所持アイテム全ての重量を参照する
            count = UnitItemControl.getPossessionItemCount(unit);
            for (i = 0; i < count; i++) {
                item = UnitItemControl.getItem(unit, i);
                totalWeight += item.getWeight();
            }
        } else {
            // 装備武器の重量のみ参照する
            item = ItemControl.getEquippedWeapon(unit);
            totalWeight += item.getWeight();
        }

        defaultWT = classWT - spd + totalWeight;

        return Math.max(defaultWT, 0);
    },

    // 指定したIDのユニットのatCountを取得する
    getATCount: function (id, unitGroup) {
        var i, count, unit;
        var realId = id + 65536 * unitGroup;
        var playerList = PlayerList.getSortieList();
        var enemyList = EnemyList.getAliveList();
        var allyList = AllyList.getAliveList();

        count = playerList.getCount();
        for (i = 0; i < count; i++) {
            unit = playerList.getData(i);

            if (unit.getId() !== realId) {
                continue;
            }

            if (typeof unit.custom.atCount === "number") {
                return unit.custom.atCount;
            }
        }

        count = enemyList.getCount();
        for (i = 0; i < count; i++) {
            unit = enemyList.getData(i);

            if (unit.getId() !== realId) {
                continue;
            }

            if (typeof unit.custom.atCount === "number") {
                return unit.custom.atCount;
            }
        }

        count = allyList.getCount();
        for (i = 0; i < count; i++) {
            unit = allyList.getData(i);

            if (unit.getId() !== realId) {
                continue;
            }

            if (typeof unit.custom.atCount === "number") {
                return unit.custom.atCount;
            }
        }

        return -1;
    },

    // 現在のマップの合計WT値を取得する
    getMapTotalWT: function () {
        var curMapInfo = root.getCurrentSession().getCurrentMapInfo();

        if (curMapInfo == null || typeof curMapInfo.custom.totalWT !== "number") {
            return -1;
        }

        return curMapInfo.custom.totalWT;
    },

    // 現在のマップの合計WT値を設定する
    setMapTotalWT: function (totalWT) {
        var curMapInfo = root.getCurrentSession().getCurrentMapInfo();

        if (curMapInfo == null) {
            return;
        }

        curMapInfo.custom.totalWT = totalWT;
    },

    // 行動順予測用のカスパラを初期化する
    initPredictParam: function (unit) {
        if (unit === null) {
            return;
        }

        delete unit.custom.isPredicting;
        delete unit.custom.hasCharged;
    }
};

(function () {
    /*-----------------------------------------------------------------------------------------------------------------
        出撃準備画面で出撃ユニットを変更時、行動順リストを初期化する
    *----------------------------------------------------------------------------------------------------------------*/
    UnitSortieScreen._moveSelect = function () {
        var index = this._leftWindow.getUnitListIndex();

        SceneManager.getActiveScene().getSortieSetting().setSortieMark(index);
        WaitTurnOrderManager.initialize();
        return MoveResult.CONTINUE;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        出撃準備画面でアイテム交換やストック交換を実行時、行動順リストを初期化する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias000 = ItemControl.updatePossessionItem;
    ItemControl.updatePossessionItem = function (unit) {
        alias000.call(this, unit);

        if (root.getCurrentScene() === SceneType.BATTLESETUP) {
            WaitTurnOrderManager.initialize();
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        マップ開始時、ATユニットの所属に応じて最初のフェイズを決定する
    *----------------------------------------------------------------------------------------------------------------*/
    TurnChangeMapStart.doLastAction = function () {
        var atUnitType, turnType;

        WaitTurnOrderManager.attackTurnEnd();
        atUnitType = WaitTurnOrderManager.getATUnitType();

        if (atUnitType === UnitType.PLAYER) {
            turnType = TurnType.PLAYER;
        } else if (atUnitType === UnitType.ENEMY) {
            turnType = TurnType.ENEMY;
        } else if (atUnitType === UnitType.ALLY) {
            turnType = TurnType.ALLY;
        }

        root.getCurrentSession().setTurnCount(0);
        root.getCurrentSession().setTurnType(turnType);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        マップ上でのセーブデータのロード時、リストを再構築する
    *----------------------------------------------------------------------------------------------------------------*/
    LoadSaveScreen._executeLoad = function () {
        var object = this._scrollbar.getObject();

        if (object.isCompleteFile() || object.getMapInfo() !== null) {
            SceneManager.setEffectAllRange(true);

            // 内部でroot.changeSceneが呼ばれ、セーブファイルに記録されているシーンに変更される。
            root.getLoadSaveManager().loadFile(this._scrollbar.getIndex());

            if (root.getCurrentScene() === SceneType.FREE) {
                WaitTurnOrderManager.rebuildList();
            }
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        マップ開始時のみターン数を加算する
    *----------------------------------------------------------------------------------------------------------------*/
    BaseTurnLogoFlowEntry.doMainAction = function (isMusic) {
        var startEndType;

        if (root.getCurrentSession().getTurnCount() === 0) {
            root.getCurrentSession().setTurnCount(root.getCurrentSession().getTurnCount() + 1);
        }

        if (isMusic) {
            this._changeMusic();
        }

        startEndType = this._turnChange.getStartEndType();
        if (startEndType === StartEndType.PLAYER_START) {
            // 自軍ターンが開始される場合、自動でスキップされることはない
            CurrentMap.setTurnSkipMode(false);
        } else {
            // 敵軍、または同盟軍の場合は、オートターンスキップを確認する
            CurrentMap.setTurnSkipMode(this._isAutoTurnSkip());
        }

        CurrentMap.enableEnemyAcceleration(true);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        マップ開始時のみロゴの演出を表示する
    *----------------------------------------------------------------------------------------------------------------*/
    TurnMarkFlowEntry._completeMemberData = function (turnChange) {
        if (!this._isTurnGraphicsDisplayable()) {
            // ユニットが一人も存在しない場合は、
            // 画像を表示することなく終了処理に入る。
            this.doMainAction(false);
            return EnterResult.NOTENTER;
        }

        if (root.getCurrentSession().getTurnCount() === 0) {
            this._counter.disableGameAcceleration();
            this._counter.setCounterInfo(36);
            this._playTurnChangeSound();
        }

        return EnterResult.OK;
    };

    TurnMarkFlowEntry._getTurnFrame = function () {
        var pic = null;

        if (root.getCurrentSession().getTurnCount() === 0) {
            pic = root.queryUI("playerturn_frame");
        }

        return pic;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        フェイズの切り替え時にBGMは変えない
    *----------------------------------------------------------------------------------------------------------------*/
    BaseTurnLogoFlowEntry._changeMusic = function () {
        var mapInfo = root.getCurrentSession().getCurrentMapInfo();
        var handle = mapInfo.getPlayerTurnMusicHandle();
        var handleActive = root.getMediaManager().getActiveMusicHandle();

        // 現在の音楽と異なる音楽の場合のみ再生
        if (!handle.isEqualHandle(handleActive)) {
            MediaControl.resetMusicList();
            MediaControl.musicPlayNew(handle);
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        フェイズ開始時にATユニットのステートの残りターンを減少させる
    *----------------------------------------------------------------------------------------------------------------*/
    StateTurnFlowEntry._checkStateTurn = function () {
        var i, count, list, unit, obj;
        var arr = [];
        var turnType = root.getCurrentSession().getTurnType();

        if (turnType === TurnType.PLAYER) {
            list = PlayerList.getSortieList();
        } else if (turnType === TurnType.ENEMY) {
            list = EnemyList.getAliveList();
        } else if (turnType === TurnType.ALLY) {
            list = AllyList.getAliveList();
        }

        count = list.getCount();
        for (i = 0; i < count; i++) {
            unit = list.getData(i);

            if (typeof unit.custom.isAT === "boolean" && unit.custom.isAT) {
                arr.push(unit);
                break;
            }
        }

        obj = StructureBuilder.buildDataList();
        obj.setDataArray(arr);

        StateControl.decreaseTurn(obj);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        自軍フェイズ開始時の処理
    *----------------------------------------------------------------------------------------------------------------*/
    PlayerTurn._setDefaultActiveUnit = function () {
        var unit = WaitTurnOrderManager.getATUnit();

        // ターンダメージで撃破された場合はnullになる
        if (unit !== null) {
            root.getCurrentSession().setActiveEventUnit(unit);
        }
    };

    PlayerTurn._getDefaultCursorPos = function () {
        var list = PlayerList.getSortieList();
        var targetUnit = WaitTurnOrderManager.getATUnit();

        if (targetUnit === null) {
            targetUnit = list.getData(0);
        }

        if (targetUnit !== null) {
            return createPos(targetUnit.getMapX(), targetUnit.getMapY());
        }

        return null;
    };

    TurnChangeStart.doLastAction = function () {
        var turnType = root.getCurrentSession().getTurnType();
        var curMapCustom = root.getCurrentSession().getCurrentMapInfo().custom;
        var isWaitSelected = typeof curMapCustom.isWaitSelected === "boolean" ? curMapCustom.isWaitSelected : false;

        // 直前に待機コマンドが選択されているときに効果音が二重に再生されるのを防ぐ
        if (turnType === TurnType.PLAYER && !isWaitSelected) {
            MediaControl.soundDirect("commandselect");
        }

        curMapCustom.isWaitSelected = false;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ATでない自軍ユニット上での決定キー押下をマップコマンド扱いにする
    *----------------------------------------------------------------------------------------------------------------*/
    PlayerTurn._moveMap = function () {
        var isAT;
        var result = this._mapEdit.moveMapEdit();

        if (result === MapEditResult.UNITSELECT) {
            this._targetUnit = this._mapEdit.getEditTarget();
            if (this._targetUnit !== null) {
                isAT = this._targetUnit.custom.isAT;

                if (typeof isAT === "boolean" && isAT) {
                    // ユニットの移動範囲を表示するモードに進む
                    this._mapSequenceArea.openSequence(this);
                    this.changeCycleMode(PlayerTurnMode.AREA);
                } else {
                    this._mapEdit.clearRange();

                    this._mapCommandManager.openListCommandManager();
                    this.changeCycleMode(PlayerTurnMode.MAPCOMMAND);
                }
            }
        } else if (result === MapEditResult.MAPCHIPSELECT) {
            this._mapCommandManager.openListCommandManager();
            this.changeCycleMode(PlayerTurnMode.MAPCOMMAND);
        }

        return MoveResult.CONTINUE;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        キーボードのA/Sキーでユニットの行動順にマップカーソルを遷移する
    *----------------------------------------------------------------------------------------------------------------*/
    MapEdit._changeTarget = function (isNext) {
        var i, unit;
        var targetUnit = this.getEditTarget();
        var list = WaitTurnOrderManager.getOrderTopList();
        var count = list.length;
        var index = 0;

        if (targetUnit != null) {
            for (i = 0; i < count; i++) {
                unit = list[i].unit;

                if (targetUnit.getId() === unit.getId()) {
                    index = i;
                    break;
                }
            }
        } else {
            index = isNext ? -1 : 1;
        }

        for (;;) {
            if (isNext) {
                index++;
            } else {
                index--;
            }

            if (index >= count) {
                index = 0;
            } else if (index < 0) {
                index = count - 1;
            }

            obj = list[index];
            if (obj == null || obj.unit == null) {
                break;
            }

            unit = obj.unit;

            if (!unit.isWait()) {
                this._activeIndex = index;
                this._setUnit(unit);
                this._setFocus(unit);
                break;
            }

            if (index === this._activeIndex) {
                break;
            }
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        自軍のATユニットが行動終了している、または行動できない場合自軍フェイズを終了する
    *----------------------------------------------------------------------------------------------------------------*/
    PlayerTurn._checkAutoTurnEnd = function () {
        var atUnit;
        var isTurnEnd = false;
        var list = PlayerList.getSortieList();
        var count = list.getCount();

        // コンフィグ画面でオートターンエンドを選択したと同時に、ターン変更が起きないようにする。
        // 戦闘で生存者が0になったと同時に、ターン終了させない意図もある。
        if (this.getCycleMode() !== PlayerTurnMode.MAP) {
            return false;
        }

        // オートターンが有効でない場合でも、生存者が存在しなくなった場合は、ターンを終了する
        if (count === 0) {
            TurnControl.turnEnd();
            return true;
        }

        if (!EnvironmentControl.isAutoTurnEnd()) {
            return false;
        }

        atUnit = WaitTurnOrderManager.getATUnit();

        if (!StateControl.isTargetControllable(atUnit) || atUnit.isWait()) {
            isTurnEnd = true;
        }

        if (isTurnEnd) {
            this._isPlayerActioned = false;
            TurnControl.turnEnd();
        }

        return isTurnEnd;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ActorListにATユニットのみ格納する
    *----------------------------------------------------------------------------------------------------------------*/
    TurnControl.getActorList = function () {
        var i, count, unit, obj;
        var list = null;
        var arr = [];
        var turnType = root.getCurrentSession().getTurnType();

        if (turnType === TurnType.PLAYER) {
            list = PlayerList.getSortieList();
        } else if (turnType === TurnType.ENEMY) {
            list = EnemyList.getAliveList();
        } else if (turnType === TurnType.ALLY) {
            list = AllyList.getAliveList();
        }

        count = list.getCount();
        for (i = 0; i < count; i++) {
            unit = list.getData(i);

            if (typeof unit.custom.isAT === "boolean" && unit.custom.isAT) {
                arr.push(unit);
                break;
            }
        }

        obj = StructureBuilder.buildDataList();
        obj.setDataArray(arr);

        return obj;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        移動キャンセル時に待機時間予測用のカスパラを初期化する
    *----------------------------------------------------------------------------------------------------------------*/
    MapSequenceCommand._moveCommand = function () {
        var result;

        if (this._unitCommandManager.moveListCommandManager() !== MoveResult.CONTINUE) {
            result = this._doLastAction();
            if (result === 0) {
                this._straightFlow.enterStraightFlow();
                this.changeCycleMode(MapSequenceCommandMode.FLOW);
            } else if (result === 1) {
                return MapSequenceCommandResult.COMPLETE;
            } else {
                WaitTurnOrderManager.initPredictParam(this._targetUnit);
                this._targetUnit.setMostResentMov(0);
                return MapSequenceCommandResult.CANCEL;
            }
        }

        return MapSequenceCommandResult.NONE;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ユニットコマンド選択中に行動順予測のフラグを立てる
    *----------------------------------------------------------------------------------------------------------------*/
    UnitCommand.Wait.isWaitCommand = true;

    UnitCommand._moveTitle = function () {
        var weapon, isCharging;
        var unit = this.getListCommandUnit();
        var mapCustom = root.getCurrentSession().getCurrentMapInfo().custom;
        var object = this._commandScrollbar.getObject();
        var result = MoveResult.CONTINUE;

        unit.custom.isPredicting = true;

        if (typeof object.isChargeCommand === "boolean" && object.isChargeCommand) {
            weapon = ItemControl.getEquippedWeapon(unit);

            if (weapon !== null && typeof weapon.custom.chargeWT === "number") {
                unit.custom.hasCharged = true;
                unit.custom.chargeWT = weapon.custom.chargeWT;
                unit.custom.chargeWeaponId = weapon.getId();
                unit.custom.chargeStartMapTotalWT = WaitTurnOrderManager.getMapTotalWT();
            }
        } else {
            isCharging = unit.custom.isCharging;

            if (typeof isCharging !== "boolean" || !isCharging) {
                delete unit.custom.hasCharged;
                delete unit.custom.chargeWT;
                delete unit.custom.chargeWeaponId;
                delete unit.custom.chargeStartMapTotalWT;
            }
        }

        // 待機時に効果音が二重に再生されるのを防ぐためにフラグを立てる
        if (typeof object.isWaitCommand === "boolean" && object.isWaitCommand) {
            mapCustom.isWaitSelected = true;
        } else {
            delete mapCustom.isWaitSelected;
        }

        if (InputControl.isSelectAction()) {
            if (object === null) {
                return result;
            }

            object.openCommand();

            this._playCommandSelectSound();
            this.changeCycleMode(ListCommandManagerMode.OPEN);
        } else if (InputControl.isCancelAction()) {
            delete unit.custom.isPredicting;
            delete unit.custom.hasCharged;
            delete unit.custom.chargeWT;
            delete unit.custom.chargeWeaponId;
            delete unit.custom.chargeStartMapTotalWT;

            this._playCommandCancelSound();
            this._checkTracingScroll();
            result = MoveResult.END;
        } else {
            this._commandScrollbar.moveScrollbarCursor();
        }

        return result;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        フェイズ終了時にATユニットの待機状態を解除し、行動順リストを更新する
    *----------------------------------------------------------------------------------------------------------------*/
    TurnChangeEnd._checkActorList = function () {
        var unit = WaitTurnOrderManager.getATUnit();

        if (unit !== null) {
            this._removeWaitState(unit);

            unit = FusionControl.getFusionChild(unit);
            if (unit !== null) {
                // フュージョンされているユニットの待機状態も解除される
                this._removeWaitState(unit);
            }
        }

        WaitTurnOrderManager.attackTurnEnd();
    };

    /*-----------------------------------------------------------------------------------------------------------------
        フェイズ終了時、ATユニットの所属に応じて次のフェイズを開始する
    *----------------------------------------------------------------------------------------------------------------*/
    TurnChangeEnd._startNextTurn = function () {
        var nextTurnType, atUnitType;

        this._checkActorList();

        atUnitType = WaitTurnOrderManager.getATUnitType();

        if (atUnitType === UnitType.PLAYER) {
            nextTurnType = TurnType.PLAYER;
        } else if (atUnitType === UnitType.ENEMY) {
            nextTurnType = TurnType.ENEMY;
        } else if (atUnitType === UnitType.ALLY) {
            nextTurnType = TurnType.ALLY;
        }

        root.getCurrentSession().setTurnType(nextTurnType);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ユニット登場時、ユニットのカスパラを初期化して行動順リストを再構築する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias001 = ScriptCall_AppearEventUnit;
    ScriptCall_AppearEventUnit = function (unit) {
        alias001.call(this, unit);
        var sceneType = root.getBaseScene();

        if (sceneType === SceneType.BATTLESETUP || sceneType === SceneType.FREE) {
            WaitTurnOrderManager.initUnitParam(unit);
            WaitTurnOrderManager.rebuildList();
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        援軍出現時、ユニットのカスパラを初期化して行動順リストを再構築する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias002 = ReinforcementChecker._appearUnit;
    ReinforcementChecker._appearUnit = function (pageData, x, y) {
        var unit = alias002.call(this, pageData, x, y);

        if (unit !== null) {
            WaitTurnOrderManager.initUnitParam(unit);
            WaitTurnOrderManager.rebuildList();
        }

        return unit;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ゲーム開始時にGraphicsManagerとカーソル画像を読み込む
    *----------------------------------------------------------------------------------------------------------------*/
    var graphicsManager = null;
    var cursorPic = null;
    var iconPic = null;

    var alias003 = SetupControl.setup;
    SetupControl.setup = function () {
        alias003.call(this);
        var baseList;

        if (graphicsManager == null) {
            graphicsManager = root.getGraphicsManager();
        }
        if (cursorPic == null) {
            cursorPic = root.queryUI("command_poschangecursor");
        }
        if (iconPic == null) {
            baseList = root.getBaseData().getGraphicsResourceList(GraphicsType.ICON, true);
            iconPic = baseList.getCollectionData(1, 0);
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ユニットの行動順を表示するMapParts.WTOrderを新たに作成
    *----------------------------------------------------------------------------------------------------------------*/
    MapParts.WTOrder = defineObject(BaseMapParts, {
        drawMapParts: function () {
            var x, y;

            x = this._getPositionX();
            y = this._getPositionY();

            this._drawMain(x, y);
        },

        _drawMain: function (x, y) {
            var textui = this._getWindowTextUI();

            this._drawContent(x, y, textui);
        },

        _drawContent: function (x, y, textui) {
            var i, count, obj, unit, isPredicting, width, height;
            var atUnit = WaitTurnOrderManager.getATUnit();
            var predictOrderList = WaitTurnOrderManager.getPredictOrderList(atUnit);
            var color = 0x101010;
            var alpha = 130;

            if (predictOrderList == null) {
                return;
            }

            if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                width = root.getCharChipWidth() * 2;
                height = root.getGameAreaHeight();
            } else {
                width = root.getGameAreaWidth();
                height = root.getCharChipHeight() * 2;
            }

            graphicsManager.fillRange(x, y, width, height, color, alpha);

            if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                x += WaitTurnOrderParam.RIGHT_ORDER_LIST_START_POS_X;
                y += WaitTurnOrderParam.RIGHT_ORDER_LIST_START_POS_Y;
            } else {
                x += WaitTurnOrderParam.BOTTOM_ORDER_LIST_START_POS_X;
                y += WaitTurnOrderParam.BOTTOM_ORDER_LIST_START_POS_Y;
            }

            count = Math.min(predictOrderList.length, WaitTurnOrderParam.ORDER_LIST_UNIT_NUM);
            for (i = 0; i < count; i++) {
                obj = predictOrderList[i];
                unit = obj.unit;

                if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                    if (i === 0) {
                        iconPic.drawParts(x - 10, y + 5, 0, 24 * 3, 24, 24);
                    } else {
                        NumberRenderer.drawNumber(x, y + 4, i + 1);
                    }
                } else {
                    if (i === 0) {
                        iconPic.drawParts(x + 5, y - 10, 0, 24 * 3, 24, 24);
                    } else {
                        if (i + 1 < 10) {
                            NumberRenderer.drawNumber(x + 11, y - 10, i + 1);
                        } else {
                            NumberRenderer.drawNumber(x + 15, y - 10, i + 1);
                        }
                    }
                }

                if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                    UnitRenderer.drawDefaultUnit(unit, x + 16, y, null);
                } else {
                    UnitRenderer.drawDefaultUnit(unit, x, y + 16, null);
                }

                // ユニットコマンド選択中はMapParts.OrderCursorによる強調表示がなくなるので
                // こっちで処理する
                isPredicting = atUnit.custom.isPredicting;
                if (typeof isPredicting === "boolean" || isPredicting) {
                    if (unit.getId() === atUnit.getId() && i > 0) {
                        if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                            cursorPic.drawParts(x, y, 0, 0, 32, 32);
                        } else {
                            cursorPic.setDegree(90);
                            cursorPic.drawParts(x - 3, y - 10, 0, 0, 32, 32);
                        }
                    }
                }

                if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                    y += 32;
                } else {
                    x += 32;
                }
            }
        },

        _getPositionX: function () {
            if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                return root.getGameAreaWidth() - GraphicsFormat.MAPCHIP_WIDTH * 2;
            }

            return 0;
        },

        _getPositionY: function () {
            if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                return 0;
            }

            return root.getGameAreaHeight() - GraphicsFormat.MAPCHIP_HEIGHT * 2;
        },

        _getWindowTextUI: function () {
            return root.queryTextUI("default_window");
        }
    });

    /*-----------------------------------------------------------------------------------------------------------------
        行動順表示内でマップカーソル中のユニットを強調するMapParts.OrderCursorを新たに作成
    *----------------------------------------------------------------------------------------------------------------*/
    MapParts.OrderCursor = defineObject(BaseMapParts, {
        drawMapParts: function () {
            var x, y;

            x = this._getPositionX();
            y = this._getPositionY();

            this._drawMain(x, y);
        },

        _drawMain: function (x, y) {
            var textui = this._getWindowTextUI();

            this._drawContent(x, y, textui);
        },

        _drawContent: function (x, y, textui) {
            var i, count, obj, unit;
            var atUnit = WaitTurnOrderManager.getATUnit();
            var predictOrderList = WaitTurnOrderManager.getPredictOrderList(atUnit);
            var targetUnit = null;

            if (predictOrderList == null || this._mapCursor == null) {
                return;
            }

            targetUnit = this.getMapPartsTarget();

            if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                x += 0;
                y += WaitTurnOrderParam.RIGHT_ORDER_LIST_START_POS_Y;
            } else {
                x += WaitTurnOrderParam.BOTTOM_ORDER_LIST_START_POS_X;
                y += 0;
            }

            count = Math.min(predictOrderList.length, WaitTurnOrderParam.ORDER_LIST_UNIT_NUM);
            for (i = 0; i < count; i++) {
                obj = predictOrderList[i];
                unit = obj.unit;

                if (targetUnit != null && targetUnit.getId() === unit.getId() && i > 0) {
                    if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                        cursorPic.drawParts(x, y, 0, 0, 32, 32);
                    } else {
                        cursorPic.setDegree(90);
                        cursorPic.drawParts(x - 3, y - 10, 0, 0, 32, 32);
                    }
                }

                if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                    y += 32;
                } else {
                    x += 32;
                }
            }
        },

        _getPositionX: function () {
            if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                return root.getGameAreaWidth() - GraphicsFormat.MAPCHIP_WIDTH * 2;
            }

            return 0;
        },

        _getPositionY: function () {
            if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                return 0;
            }

            return root.getGameAreaHeight() - GraphicsFormat.MAPCHIP_HEIGHT * 2;
        },

        _getWindowTextUI: function () {
            return root.queryTextUI("default_window");
        }
    });

    /*-----------------------------------------------------------------------------------------------------------------
        新たに作成したMapParts.OrderCursorをMapPartsCollectionに追加する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias004 = MapPartsCollection._configureMapParts;
    MapPartsCollection._configureMapParts = function (groupArray) {
        alias004.call(this, groupArray);

        groupArray.appendObject(MapParts.OrderCursor);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        MapLayerクラスに_mapPartsArrayを追加し、MapParts.WTOrderを入れる
    *----------------------------------------------------------------------------------------------------------------*/
    var alias005 = MapLayer.prepareMapLayer;
    MapLayer.prepareMapLayer = function () {
        alias005.call(this, MapLayer.prepareMapLayer);

        this._mapPartsArray = [];
        this._configureMapParts(this._mapPartsArray);
    };

    MapLayer._configureMapParts = function (groupArray) {
        groupArray.appendObject(MapParts.WTOrder);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        MapLayerクラスにdrawUILayerを追加し、drawUnitLayerを呼んでいる箇所で一緒に呼ぶ
    *----------------------------------------------------------------------------------------------------------------*/
    MapLayer.drawUILayer = function () {
        var i;
        var count = this._mapPartsArray.length;

        for (i = 0; i < count; i++) {
            this._mapPartsArray[i].drawMapParts();
        }
    };

    var alias006 = MapLayer.drawUnitLayer;
    MapLayer.drawUnitLayer = function () {
        alias006.call(this);

        this.drawUILayer();
    };

    /*-----------------------------------------------------------------------------------------------------------------
        戦闘時に毎回UIを描画することのないよう、キャッシュに描画しておく
    *----------------------------------------------------------------------------------------------------------------*/
    var alias007 = ClipingBattleContainer._createMapCache;
    ClipingBattleContainer._createMapCache = function () {
        var cache = alias007.call(this);

        MapLayer.drawUILayer();

        return cache;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ユニットメニューにWT値を表示する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias008 = UnitMenuTopWindow.drawWindowContent;
    UnitMenuTopWindow.drawWindowContent = function (x, y) {
        alias008.call(this, x, y);

        this._drawUnitWT(x, y);
    };

    UnitMenuTopWindow._drawUnitHp = function (xBase, yBase) {
        var x = xBase + 303;
        var y = yBase + 50;
        var pic = root.queryUI("unit_gauge");

        y -= 16; // HPの位置を変更する

        ContentRenderer.drawUnitHpZoneEx(x, y, this._unit, pic, this._mhp);
    };

    UnitMenuTopWindow._drawUnitWT = function (xBase, yBase) {
        var x, y, curWT, unitWT;
        var unit = this._unit;

        if (unit == null || typeof unit.custom.curWT !== "number") {
            return;
        }

        curWT = unit.custom.curWT;
        unitWT = WaitTurnOrderManager.calcUnitWT(unit);

        x = xBase + 303;
        y = yBase + 70;

        TextRenderer.drawSignText(x, y, "WT");
        NumberRenderer.drawNumber(x + 44, y - 1, curWT);
        TextRenderer.drawSignText(x + 60, y, "/");
        NumberRenderer.drawNumber(x + 98, y - 1, unitWT);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ユニット情報にWT値を表示する
    *----------------------------------------------------------------------------------------------------------------*/
    UnitSimpleRenderer.drawContentEx = function (x, y, unit, textui, mhp) {
        this._drawFace(x, y, unit, textui);
        this._drawName(x, y - 5, unit, textui);
        this._drawInfo(x, y - 15, unit, textui);
        this._drawSubInfo(x, y - 20, unit, textui, mhp);
        this._drawWT(x, y, unit, textui);
    };

    UnitSimpleRenderer._drawWT = function (x, y, unit, textui) {
        var curWT, unitWT;

        if (unit == null || typeof unit.custom.curWT !== "number") {
            return;
        }

        curWT = unit.custom.curWT;
        unitWT = WaitTurnOrderManager.calcUnitWT(unit);

        x += GraphicsFormat.FACE_WIDTH + this._getInterval();
        y += 73;

        TextRenderer.drawSignText(x, y, "WT");
        NumberRenderer.drawNumber(x + 44, y - 1, curWT);
        TextRenderer.drawSignText(x + 60, y, "/");
        NumberRenderer.drawNumber(x + 98, y - 1, unitWT);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        マップ上のユニットのキャラチップ上に行動順を描画する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias009 = MapLayer.drawUnitLayer;
    MapLayer.drawUnitLayer = function () {
        alias009.call(this);

        this.drawWaitTurnOrderNumber();
    };

    MapLayer.drawWaitTurnOrderNumber = function () {
        var i, unit, orderNum, list, x, y, count;

        // 描画してよい状態でない場合は終了
        if (this.isOrderNumDrawScene() != true) {
            return;
        }

        list = PlayerList.getSortieList();
        count = list.getCount();

        for (i = 0; i < count; i++) {
            unit = list.getData(i);

            // そのユニットが画面内にいるときのみ描画する
            if (this._isMapInside(unit) == true && typeof unit.custom.orderNum === "number" && unit.custom.orderNum > 0) {
                orderNum = unit.custom.orderNum;
                x = LayoutControl.getPixelX(unit.getMapX());
                y = LayoutControl.getPixelY(unit.getMapY());
                this.drawOrderNumberByPos(x, y, orderNum);
            }
        }

        list = EnemyList.getAliveList();
        count = list.getCount();

        for (i = 0; i < count; i++) {
            unit = list.getData(i);

            // そのユニットが画面内にいるときのみ描画する
            if (this._isMapInside(unit) == true && typeof unit.custom.orderNum === "number" && unit.custom.orderNum > 0) {
                orderNum = unit.custom.orderNum;
                x = LayoutControl.getPixelX(unit.getMapX());
                y = LayoutControl.getPixelY(unit.getMapY());
                this.drawOrderNumberByPos(x, y, orderNum);
            }
        }

        list = AllyList.getAliveList();
        count = list.getCount();

        for (i = 0; i < count; i++) {
            unit = list.getData(i);

            // そのユニットが画面内にいるときのみ描画する
            if (this._isMapInside(unit) == true && typeof unit.custom.orderNum === "number" && unit.custom.orderNum > 0) {
                orderNum = unit.custom.orderNum;
                x = LayoutControl.getPixelX(unit.getMapX());
                y = LayoutControl.getPixelY(unit.getMapY());
                this.drawOrderNumberByPos(x, y, orderNum);
            }
        }
    };

    MapLayer.drawOrderNumberByPos = function (x, y, orderNum) {
        var turnType = root.getCurrentSession().getTurnType();

        // 自軍フェイズのみ描画する
        if (turnType !== TurnType.PLAYER) {
            return;
        }

        if (orderNum === 1) {
            iconPic.drawStretchParts(x - 4, y - 4, 20, 20, 0, 24 * 3, 24, 24);
        } else {
            NumberRenderer.drawRightNumber(x, y - 4, orderNum);
        }
    };

    MapLayer._isMapInside = function (unit) {
        if (CurrentMap.isMapInside(unit.getMapX(), unit.getMapY())) {
            // 非表示でなければ出す
            if (unit.isInvisible() !== true) {
                return true;
            }
        }
        return false;
    };

    MapLayer.isOrderNumDrawScene = function () {
        var sceneType = root.getCurrentScene();

        // 戦闘準備画面かマップ開始後であれば描画する
        if (sceneType !== SceneType.FREE && sceneType !== SceneType.BATTLESETUP) {
            return false;
        }

        return true;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        マップの右端2列または下端2列にカーソルが侵入できないようにする（キーボード）
    *----------------------------------------------------------------------------------------------------------------*/
    MapCursor._changeCursorValue = function (input) {
        var session = root.getCurrentSession();
        var xCursor = session.getMapCursorX();
        var yCursor = session.getMapCursorY();
        var n = root.getCurrentSession().getMapBoundaryValue();

        if (input === InputType.LEFT) {
            xCursor--;
        } else if (input === InputType.UP) {
            yCursor--;
        } else if (input === InputType.RIGHT) {
            xCursor++;
        } else if (input === InputType.DOWN) {
            yCursor++;
        }

        if (xCursor < n) {
            xCursor = n;
        } else if (yCursor < n) {
            yCursor = n;
        } else if (IS_WT_ORDER_LIST_LOCATED_RIGHT && xCursor > CurrentMap.getWidth() - 1 - 2) {
            xCursor = CurrentMap.getWidth() - 1 - 2;
        } else if (!IS_WT_ORDER_LIST_LOCATED_RIGHT && xCursor > CurrentMap.getWidth() - 1 - n) {
            xCursor = CurrentMap.getWidth() - 1 - n;
        } else if (IS_WT_ORDER_LIST_LOCATED_RIGHT && yCursor > CurrentMap.getHeight() - 1 - n) {
            yCursor = CurrentMap.getHeight() - 1 - n;
        } else if (!IS_WT_ORDER_LIST_LOCATED_RIGHT && yCursor > CurrentMap.getHeight() - 1 - 2) {
            yCursor = CurrentMap.getHeight() - 1 - 2;
        } else {
            // カーソルが移動できたため、音を鳴らす
            this._playMovingSound();
        }

        MapView.setScroll(xCursor, yCursor);

        session.setMapCursorX(xCursor);
        session.setMapCursorY(yCursor);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        マップの右端2列または下端2列にカーソルが侵入できないようにする（マウス）
    *----------------------------------------------------------------------------------------------------------------*/
    MouseControl._adjustMapCursor = function () {
        var session = root.getCurrentSession();
        var xCursor = Math.floor((root.getMouseX() + session.getScrollPixelX() - root.getViewportX()) / GraphicsFormat.MAPCHIP_WIDTH);
        var yCursor = Math.floor((root.getMouseY() + session.getScrollPixelY() - root.getViewportY()) / GraphicsFormat.MAPCHIP_HEIGHT);

        if (IS_WT_ORDER_LIST_LOCATED_RIGHT && xCursor > CurrentMap.getWidth() - 1 - 2) {
            xCursor = CurrentMap.getWidth() - 1 - 2;
        } else if (!IS_WT_ORDER_LIST_LOCATED_RIGHT && yCursor > CurrentMap.getHeight() - 1 - 2) {
            yCursor = CurrentMap.getHeight() - 1 - 2;
        }

        root.getCurrentSession().setMapCursorX(xCursor);
        root.getCurrentSession().setMapCursorY(yCursor);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        マップの右端2列または下端2列にユニットの移動範囲や攻撃範囲を示すパネルを表示しないようにする
    *----------------------------------------------------------------------------------------------------------------*/
    MapChipLight.setIndexArray = function (indexArray) {
        this._indexArray = CDB_rebuildIndexArray(indexArray);
    };

    var alias010 = MarkingPanel.updateMarkingPanel;
    MarkingPanel.updateMarkingPanel = function () {
        alias010.call(this);
        this._indexArray = CDB_rebuildIndexArray(this._indexArray);
        this._indexArrayWeapon = CDB_rebuildIndexArray(this._indexArrayWeapon);
    };

    var alias011 = MarkingPanel.updateMarkingPanelFromUnit;
    MarkingPanel.updateMarkingPanelFromUnit = function (unit) {
        alias011.call(this, unit);
        this._indexArray = CDB_rebuildIndexArray(this._indexArray);
        this._indexArrayWeapon = CDB_rebuildIndexArray(this._indexArrayWeapon);
    };

    var CDB_rebuildIndexArray = function (indexArray) {
        var i, index, mapInfo, width, height, count, newIndexArray;

        if (indexArray === null) {
            return indexArray;
        }

        mapInfo = root.getCurrentSession().getCurrentMapInfo();
        width = mapInfo.getMapWidth();
        height = mapInfo.getMapHeight();
        count = indexArray.length;
        newIndexArray = [];

        for (i = 0; i < count; i++) {
            index = indexArray[i];

            if (IS_WT_ORDER_LIST_LOCATED_RIGHT && Math.floor(index % width) >= width - 2) {
                continue;
            } else if (!IS_WT_ORDER_LIST_LOCATED_RIGHT && Math.floor(index / width) >= height - 2) {
                continue;
            }

            newIndexArray.push(index);
        }

        return newIndexArray;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ユニット情報の表示位置を調整する
    *----------------------------------------------------------------------------------------------------------------*/
    MapParts.UnitInfo._getPositionY = function (unit) {
        var y = LayoutControl.getPixelY(unit.getMapY());
        var d = root.getGameAreaHeight() / 2;
        var yBase = LayoutControl.getRelativeY(10) - 28;
        var yMin = yBase;
        var yMax = root.getGameAreaHeight() - this._getWindowHeight() - yBase;

        if (!IS_WT_ORDER_LIST_LOCATED_RIGHT) {
            yMax -= GraphicsFormat.MAPCHIP_HEIGHT * 2;
        }

        return y > d ? yMin : yMax;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        地形情報の表示位置を調整する
    *----------------------------------------------------------------------------------------------------------------*/
    MapParts.Terrain._getPositionX = function () {
        var dx = LayoutControl.getRelativeX(10) - 54;

        if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
            return root.getGameAreaWidth() - this._getWindowWidth() - dx - GraphicsFormat.MAPCHIP_WIDTH * 2;
        }

        return root.getGameAreaWidth() - this._getWindowWidth() - dx;
    };

    MapParts.Terrain._getPositionY = function () {
        var x = LayoutControl.getPixelX(this.getMapPartsX());
        var dx = root.getGameAreaWidth() / 2;
        var y = LayoutControl.getPixelY(this.getMapPartsY());
        var dy = root.getGameAreaHeight() / 2;
        var yBase = LayoutControl.getRelativeY(10) - 28;

        if (x > dx && y < dy) {
            if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                return root.getGameAreaHeight() - this._getWindowHeight() - yBase;
            } else {
                return root.getGameAreaHeight() - this._getWindowHeight() - yBase - GraphicsFormat.MAPCHIP_HEIGHT * 2;
            }
        } else {
            return yBase;
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ユニットコマンドの表示位置を調整する
    *----------------------------------------------------------------------------------------------------------------*/
    LayoutControl._getNormalizeX = function (x, width, dx) {
        var maxWidth = root.getGameAreaWidth();

        if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
            maxWidth -= GraphicsFormat.MAPCHIP_WIDTH * 2;
        }

        return this._getNormalizeValue(x, width, maxWidth, dx);
    };

    LayoutControl._getNormalizeY = function (y, height, dy) {
        var maxHeight = root.getGameAreaHeight();

        if (!IS_WT_ORDER_LIST_LOCATED_RIGHT) {
            maxHeight -= GraphicsFormat.MAPCHIP_HEIGHT * 2;
        }

        return this._getNormalizeValue(y, height, maxHeight, dy);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        コンフィグの「敵ターンスキップ」「オートターンエンド」を非表示にする
    *----------------------------------------------------------------------------------------------------------------*/
    var alias012 = ConfigWindow._configureConfigItem;
    ConfigWindow._configureConfigItem = function (groupArray) {
        alias012.call(this, groupArray);
        var i, obj;
        var count = groupArray.length;

        for (i = count - 1; i >= 0; i--) {
            obj = groupArray[i];
            if (obj.getConfigItemTitle() === StringTable.Config_AutoTurnEnd) {
                groupArray.splice(i, 1);
            } else if (obj.getConfigItemTitle() === StringTable.Config_AutoTurnSkip) {
                groupArray.splice(i, 1);
            }
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        コンフィグの「敵ターンスキップ」をデフォルトで「なし」にする
    *----------------------------------------------------------------------------------------------------------------*/
    EnvironmentControl.getAutoTurnSkipType = function () {
        return 2;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        コンフィグの「オートターンエンド」をデフォルトで「オン」にする
    *----------------------------------------------------------------------------------------------------------------*/
    EnvironmentControl.isAutoTurnEnd = function () {
        return true;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        目標確認画面に経過したWTの合計値を表示する
    *----------------------------------------------------------------------------------------------------------------*/
    ObjectiveWindow._configureObjectiveParts = function (groupArray) {
        groupArray.appendObject(ObjectiveParts.TotalWT);
        groupArray.appendObject(ObjectiveParts.Gold);
    };

    ObjectiveParts.TotalWT = defineObject(BaseObjectiveParts, {
        getObjectivePartsName: function () {
            return StringTable.Signal_TotalWT;
        },

        getObjectivePartsValue: function () {
            var totalWT = WaitTurnOrderManager.getMapTotalWT();

            if (totalWT < 0) {
                totalWT = 0;
                WaitTurnOrderManager.setMapTotalWT(totalWT);
            }

            return totalWT;
        }
    });

    /*-----------------------------------------------------------------------------------------------------------------
        ロード画面にそのマップで経過した合計WTを表示する
    *----------------------------------------------------------------------------------------------------------------*/
    LoadSaveScrollbar._drawMain = function (x, y, object, index) {
        this._drawChapterNumber(x, y, object);
        this._drawChapterName(x, y, object);
        this._drawPlayTime(x, y, object);
        this._drawTotalWT(x, y, object);
        this._drawDifficulty(x, y, object);
    };

    LoadSaveScrollbar._drawTotalWT = function (xBase, yBase, object) {
        var width, totalWT;
        var textui = this._getWindowTextUI();
        var font = textui.getFont();
        var text = StringTable.Signal_TotalWT;
        var sceneType = object.getSceneType();
        var x = xBase + 80;
        var y = yBase + 25;

        if ((sceneType === SceneType.FREE || sceneType === SceneType.BATTLESETUP) && typeof object.custom.mapTotalWT === "number") {
            totalWT = object.custom.mapTotalWT;
            TextRenderer.drawKeywordText(x, y, text, -1, ColorValue.INFO, font);
            width = TextRenderer.getTextWidth(text, font) + 30;
            NumberRenderer.drawNumber(x + width, y, totalWT);
        } else if (object.getSceneType() === SceneType.REST) {
            TextRenderer.drawKeywordText(x, y, StringTable.LoadSave_Rest, -1, ColorValue.INFO, font);
        }
    };

    LoadSaveSentence.Time.drawLoadSaveSentence = function (x, y) {
        var textui = this._getSentenceTextUI();
        var color = textui.getColor();
        var font = textui.getFont();

        this._drawTitle(x, y);

        TextRenderer.drawKeywordText(x + 70, y + 18, StringTable.PlayTime, -1, color, font);

        x += this._detailWindow.isSentenceLong() ? 20 : 0;
        ContentRenderer.drawPlayTime(x + 180, y + 18, this._saveFileInfo.getPlayTime());
    };

    LoadSaveScreen._executeSave = function () {
        var totalWT;
        var index = this._scrollbar.getIndex();
        var customObject = this._getCustomObject();
        var sceneType = root.getCurrentScene();

        if (sceneType === SceneType.FREE || sceneType === SceneType.BATTLESETUP) {
            totalWT = WaitTurnOrderManager.getMapTotalWT();

            if (totalWT >= 0) {
                customObject.mapTotalWT = totalWT;
            }
        }

        root.getLoadSaveManager().saveFile(index, this._screenParam.scene, this._screenParam.mapId, customObject);
    };
})();
