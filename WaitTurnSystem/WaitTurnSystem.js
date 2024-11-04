/*-----------------------------------------------------------------------------------------------------------------

「ウェイトターンシステム」 Ver.1.1

【概要】
ウェイトターンシステムは、ユニットの速さや所持アイテムの重量などから算出される待機時間(ウェイトターン)によって
ユニットの行動順が決まる非交互ターン制のシステムです。

従来の交互ターン制と違い、自軍フェイズや敵軍フェイズといった概念がなく、
ウェイトターン(WT)が0になったユニットから順に所属に関係なく行動できます。

本プラグインを導入することでウェイトターンシステムを実現できます。


【仕様】

[アタックターン(AT)がまわってくる仕組み]

全てのユニットは現在WT値と基本WT値を持っており、マップ開始時点では現在WT値＝基本WT値である。

まず全てのユニットの現在WT値が同じ速度で減少していき、最初に0になったユニットに手番がまわってくる。
この手番のことをアタックターン(AT)と呼ぶ。
複数のユニットの現在WT値が同時に0になった場合、自軍ユニット→敵軍ユニット→同盟軍ユニットの順に優先される。
所属も同じ場合はIDが小さい方が優先される。

ATのユニットが行動終了すると、そのユニットの現在WT値に新たにWT値が加算される。
その後、再び全てのユニットの現在WT値が減少していき、最初に0になったユニットにATがまわってくる。
これをマップの勝利条件や敗北条件が満たされるまで繰り返す。

現在WT値の減算は瞬時に行われるため、プレイヤーの目にはATユニットが行動終了したら
即座に次のユニットにATがまわっているように見える。


[WTの計算式]

基本WT値 = クラスのWT値 - ユニットの速さ + 所持アイテムの重量の合計

行動終了後に加算されるWT値 = 基本WT値 x 補正倍率※ (小数点以下切り捨て)

※補正倍率の内訳は以下の通り
移動と行動を両方行った場合→1
移動と行動のいずれかのみ行った場合→3/4
移動も行動もせず待機した場合→1/2


[行動順リスト]

ユニットの行動順は画面右側に常に表示される。
これを行動順リストと呼ぶ。

行動順リストには、本プラグイン内で設定した数(初期設定では15)のユニットが上から行動順に表示される。
表示数の設定は任意で変更できる(後述)

行動順リストはATユニットが行動終了すると更新されるほか、ATユニットのコマンド選択中にも
「現在カーソル中のコマンドを選んで行動終了すると次の行動順はどうなるか」の予測が常に反映される。

行動順リストは画面右端からマップチップの横幅x2のスペースを占有する。
このスペースにはマップカーソルは侵入できない(キーボード操作もマウス操作も同様)

ただしユニットの侵入可否は本プラグインでは制御していないので、
マップ作成時に適宜、該当マスを侵入不可にする必要がある。


[ターン開始時の演出]

マップ開始時に、リソース使用箇所の「UI」→「自軍ターン」の画像が一度だけ表示される。
以降は「自軍ターン」「敵軍ターン」「同盟軍ターン」のいずれも表示されない。

マップ開始を示す演出を入れたい場合は上記の「自軍ターン」の画像を変更する。


[合計WT]

ウェイトターンシステムにはターン数の概念が無いため、
目標確認画面やセーブ/ロード画面など、ターン数を表示している箇所には代わりにTOTAL WTという項目を表示している。
これはマップ開始から消費されたWT値の合計を表している。


[環境設定]

本プラグインの処理の都合上、環境設定の以下の項目は変更不可となっており、設定画面にも表示されない。
「オートターンエンド」
「敵ターンスキップ」



【使い方】

[必須]

1.このファイルをプロジェクトフォルダのPluginフォルダ内に保存する。

2.WT値を設定したいクラスに以下のようにカスタムパラメータを設定する。

{
    classWT: クラスのWT値
}

例)クラスのWT値を120にしたい場合
{
    classWT: 120
}

3.任意の武器とアイテムに重さを設定する。

4.マップのオープニングイベントの最後にイベントコマンド「スクリプトの実行」を作成し、
種類「コード実行」を選び、以下のテキストをプロパティ欄に貼り付ける。

WaitTurnOrderManager.initialize();


[任意]

5. このファイルの209～212行目の行動順リストの描画に関するパラメータを必要に応じて変更する。

例)行動順リストの開始位置のy座標を100、表示数を10にしたい場合
var WaitTurnOrderParam = {
    ORDER_LIST_START_POS_Y: 100,
    ORDER_LIST_UNIT_NUM: 10
};

6.マップの右端2列分を侵入不可能マスにする。

7.リソース使用箇所の「UI」→「自軍ターン」の画像を変更する。



[イベントの実行条件について]

本プラグインを導入すると、イベントの実行条件にターン数を指定することができなくなります。

そのため、ターン経過を判定する代替手段として、
以下のテキストをイベントの実行条件の「スクリプト」に貼り付けることで
「指定したユニットにATが何回まわってきたか」で条件判定できるようにしています。

WaitTurnOrderManager.getATCount(ユニットのID, ユニットの所属) === ATがまわってきた回数

ユニットの所属は、以下の分類から該当するUnitGroup.～を選んでください。

プレイヤー→     UnitGroup.PLAYER
敵→             UnitGroup.ENEMY
敵イベント→     UnitGroup.ENEMYEVENT
同盟→           UnitGroup.ALLY
同盟イベント→   UnitGroup.ALLYEVENT
援軍→           UnitGroup.REINFORCE
ゲスト→         UnitGroup.GUEST
ゲストイベント→ UnitGroup.GUESTEVENT
ブックマーク→   UnitGroup.BOOKMARK


例)敵のID:5のユニットに2回目のATがまわってきたとき

WaitTurnOrderManager.getATCount(5, UnitGroup.ENEMY) === 2


"==="の部分は、判定したい条件に応じて以下のように変更することもできます。

<   未満
<=  以下
>=  以上
>   より多い

例)プレイヤーのID:3のユニットにATがまわってきた回数が5回以上のとき

WaitTurnOrderManager.getATCount(3, UnitGroup.PLAYER) >= 5


また、以下のテキストをイベントの実行条件の「スクリプト」に貼り付けることで
「現在のマップが開始してから経過したWT値の合計」で条件判定できます。

WaitTurnOrderManager.getMapTotalWT()

例)合計WT値が1000以上のとき

WaitTurnOrderManager.getMapTotalWT() >= 1000


上記の WaitTurnOrderManager.getMapTotalWT() は戻り値として合計WT値を返すので、
スクリプトの実行で変数に入れることもできます。
これを利用して「ゲーム開始からゲームクリアまでに経過した合計WT値をカウントする」などの応用も可能です。



【作者】
さんごぱん(https://twitter.com/CordialBun)

【対応バージョン】
SRPG Studio version:1.291

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


*----------------------------------------------------------------------------------------------------------------*/

/*-----------------------------------------------------------------------------------------------------------------
    行動順リストの描画に関するパラメータ
*----------------------------------------------------------------------------------------------------------------*/
var WaitTurnOrderParam = {
    ORDER_LIST_START_POS_Y: 0, // 行動順リストの開始位置のy座標
    ORDER_LIST_UNIT_NUM: 15 // 行動順リストのユニット表示数
};

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

            if (totalWT == null) {
                this.setMapTotalWT(0);
            } else {
                this.setMapTotalWT(totalWT + atCurWT);
            }
        }

        count = this._unitList.length;

        for (i = 0; i < count; i++) {
            unit = this._unitList[i];

            if (isAttackTurnEnd) {
                unit.custom.curWT -= atCurWT;
            }

            if (i > 0) {
                unit.custom.isAT = false;
            }

            defaultWT = this.calcDefaultWT(unit);

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

            sumWT += i === 0 ? this.calcNextWT(atUnit) : this.calcDefaultWT(atUnit);
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

        unit.custom.curWT = this.calcDefaultWT(unit);
        unit.custom.orderNum = 0;
        unit.custom.isAT = false;
        unit.custom.atCount = 0;
        unit.custom.isPredicting = false;
        unit.custom.firstMove = 0;
        unit.custom.secondMove = 0;
        unit.custom.willAction = false;
        unit.custom.hasTradedItem = false;
    },

    // ユニットの基本WT値を計算する
    calcDefaultWT: function (unit) {
        var unitClass, classWT, defaultWT, spd, i, count, item, weight;
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

        count = UnitItemControl.getPossessionItemCount(unit);
        for (i = 0; i < count; i++) {
            item = UnitItemControl.getItem(unit, i);
            weight = item.getWeight();
            totalWeight += weight;
        }

        defaultWT = classWT - spd + totalWeight;

        return defaultWT;
    },

    // 次に加算されるWT値を計算する
    calcNextWT: function (unit) {
        var defaultWT, isPredicting, firstMove, secondMove, willAction, hasTradedItem, hasMoved, hasActioned;

        if (unit === null) {
            return 0;
        }

        defaultWT = this.calcDefaultWT(unit);
        isPredicting = unit.custom.isPredicting;
        firstMove = unit.custom.firstMove;
        secondMove = unit.custom.secondMove;
        willAction = unit.custom.willAction;
        hasTradedItem = unit.custom.hasTradedItem;

        if (typeof isPredicting !== "boolean" || !isPredicting) {
            return defaultWT;
        }

        if (typeof firstMove !== "number") {
            firstMove = 0;
        }

        if (typeof willAction !== "boolean") {
            willAction = false;
        }

        if (typeof hasTradedItem !== "boolean") {
            hasTradedItem = false;
        }

        hasMoved = firstMove > 0 || secondMove > 0;
        hasActioned = willAction || hasTradedItem;

        if (hasMoved && hasActioned) {
            return defaultWT;
        } else if (hasMoved || hasActioned) {
            return Math.floor((defaultWT * 3) / 4);
        } else {
            return Math.floor(defaultWT / 2);
        }
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
            return null;
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

        unit.custom.isPredicting = false;
        unit.custom.firstMove = 0;
        unit.custom.secondMove = 0;
        unit.custom.willAction = false;
        unit.custom.hasTradedItem = false;
    }
};

(function () {
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

        if (turnType === TurnType.PLAYER) {
            MediaControl.soundDirect("commandselect");
        }
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
        ユニットコマンド選択中に移動距離とカーソル位置(待機かそれ以外か)をチェックする
    *----------------------------------------------------------------------------------------------------------------*/
    UnitCommand._drawTitle = function () {
        var unit = this.getListCommandUnit();
        var obj = this._commandScrollbar.getObject();

        unit.custom.isPredicting = true;
        unit.custom.firstMove = unit.getMostResentMov();

        if (typeof obj.isWaitCommand === "boolean" && obj.isWaitCommand) {
            unit.custom.willAction = false;
        } else {
            unit.custom.willAction = true;
        }

        var x = this.getPositionX();
        var y = this.getPositionY();

        this._commandScrollbar.drawScrollbar(x, y);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        待機コマンドであることを確認するためのパラメータを追加する
    *----------------------------------------------------------------------------------------------------------------*/
    UnitCommand.Wait.isWaitCommand = true;

    /*-----------------------------------------------------------------------------------------------------------------
        アイテム交換後に待機を選択した場合にも行動したと判定できるようにする
    *----------------------------------------------------------------------------------------------------------------*/
    ItemControl.updatePossessionItem = function (unit) {
        var scene = root.getCurrentScene();
        var mhp = ParamBonus.getMhp(unit);
        var atUnit = WaitTurnOrderManager.getATUnit();

        if (scene === SceneType.FREE && atUnit != null && unit.getId() === atUnit.getId()) {
            unit.custom.hasTradedItem = true;
        }

        // シーンがFREEでもEVENTでもない場合は、常にHPは最大HPと一致する。
        // この処理を忘れた場合は、アイテム交換やアイテム増減でHPが変化する。
        if (scene !== SceneType.FREE && scene !== SceneType.EVENT) {
            unit.setHp(mhp);
        }

        // HPは最大HPを超えてはならない
        if (unit.getHp() > mhp) {
            unit.setHp(mhp);
        } else if (unit.getHp() < 1) {
            unit.setHp(1);
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        再移動での移動距離をチェックする
    *----------------------------------------------------------------------------------------------------------------*/
    RepeatMoveFlowEntry.moveFlowEntry = function () {
        var unit;
        var result = this._mapSequenceArea.moveSequence();

        if (result === MapSequenceAreaResult.COMPLETE) {
            unit = this._playerTurn.getTurnTargetUnit();
            unit.custom.secondMove = unit.getMostResentMov();

            return MoveResult.END;
        } else if (result === MapSequenceAreaResult.CANCEL) {
            return MoveResult.END;
        }

        return MoveResult.CONTINUE;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        自軍以外のユニットの移動と行動のチェックをする
    *----------------------------------------------------------------------------------------------------------------*/
    var AutoActionType = {
        MOVE: 0,
        ACTION: 1,
        WAIT: 2,
        SCROLL: 3
    };

    WeaponAutoAction.autoActionType = AutoActionType.ACTION;
    ItemAutoAction.autoActionType = AutoActionType.ACTION;
    SkillAutoAction.autoActionType = AutoActionType.ACTION;
    MoveAutoAction.autoActionType = AutoActionType.MOVE;
    WaitAutoAction.autoActionType = AutoActionType.WAIT;
    ScrollAutoAction.autoActionType = AutoActionType.SCROLL;

    EnemyTurn._moveAutoAction = function () {
        var unit, autoActionType;

        // this._autoActionIndexで識別されている行動を終えたか調べる
        if (this._autoActionArray[this._autoActionIndex].moveAutoAction() !== MoveResult.CONTINUE) {
            unit = this.getOrderUnit();
            unit.custom.isPredicting = true;
            autoActionType = this._autoActionArray[this._autoActionIndex].autoActionType;

            if (autoActionType === AutoActionType.MOVE) {
                unit.custom.firstMove = unit.getMostResentMov();
            } else if (autoActionType === AutoActionType.ACTION) {
                unit.custom.willAction = true;
            }

            if (!this._countAutoActionIndex()) {
                this._changeIdleMode(EnemyTurnMode.TOP, this._getIdleValue());
            }
        }

        return MoveResult.CONTINUE;
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
        ゲーム開始時にGraphicsManagerとカーソル画像を読み込む
    *----------------------------------------------------------------------------------------------------------------*/
    var graphicsManager = null;
    var cursorPic = null;

    var alias000 = SetupControl.setup;
    SetupControl.setup = function () {
        alias000.call(this);
        if (graphicsManager == null) {
            graphicsManager = root.getGraphicsManager();
        }
        if (cursorPic == null) {
            cursorPic = root.queryUI("command_poschangecursor");
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
            var i, count, obj, unit, isPredicting;
            var atUnit = WaitTurnOrderManager.getATUnit();
            var predictOrderList = WaitTurnOrderManager.getPredictOrderList(atUnit);
            var width = root.getCharChipWidth() * 2;
            var height = root.getGameAreaHeight();
            var color = 0x101010;
            var alpha = 130;
            var font = textui.getFont();

            if (predictOrderList == null) {
                return;
            }

            graphicsManager.fillRange(x, y, width, height, color, alpha);

            x += 10;
            y += WaitTurnOrderParam.ORDER_LIST_START_POS_Y;

            count = Math.min(predictOrderList.length, WaitTurnOrderParam.ORDER_LIST_UNIT_NUM);
            for (i = 0; i < count; i++) {
                obj = predictOrderList[i];
                unit = obj.unit;

                if (i === 0) {
                    TextRenderer.drawText(x - 6, y + 11, "AT", -1, ColorValue.KEYWORD, font);
                } else {
                    NumberRenderer.drawNumber(x, y + 4, i + 1);
                }

                UnitRenderer.drawDefaultUnit(unit, x + 16, y, null);

                // ユニットコマンド選択中はMapParts.OrderCursorによる強調表示がなくなるので
                // こっちで処理する
                isPredicting = atUnit.custom.isPredicting;
                if (typeof isPredicting !== "boolean" || isPredicting) {
                    if (unit.getId() === atUnit.getId() && i > 0) {
                        cursorPic.drawParts(x, y, 0, 0, 32, 32);
                    }
                }

                y += 32;
            }
        },

        _getPositionX: function () {
            return root.getGameAreaWidth() - GraphicsFormat.MAPCHIP_WIDTH * 2;
        },

        _getPositionY: function () {
            return 0;
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

            x += 0;
            y += WaitTurnOrderParam.ORDER_LIST_START_POS_Y;

            count = Math.min(predictOrderList.length, WaitTurnOrderParam.ORDER_LIST_UNIT_NUM);
            for (i = 0; i < count; i++) {
                obj = predictOrderList[i];
                unit = obj.unit;

                if (targetUnit != null && targetUnit.getId() === unit.getId() && i > 0) {
                    cursorPic.drawParts(x, y, 0, 0, 32, 32);
                }

                y += 32;
            }
        },

        _getPositionX: function () {
            return root.getGameAreaWidth() - GraphicsFormat.MAPCHIP_WIDTH * 2;
        },

        _getPositionY: function () {
            return 0;
        },

        _getWindowTextUI: function () {
            return root.queryTextUI("default_window");
        }
    });

    /*-----------------------------------------------------------------------------------------------------------------
        新たに作成したMapParts.OrderCursorをMapPartsCollectionに追加する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias001 = MapPartsCollection._configureMapParts;
    MapPartsCollection._configureMapParts = function (groupArray) {
        alias001.call(this, groupArray);

        groupArray.appendObject(MapParts.OrderCursor);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        MapLayerクラスに_mapPartsArrayを追加し、MapParts.WTOrderを入れる
    *----------------------------------------------------------------------------------------------------------------*/
    var alias002 = MapLayer.prepareMapLayer;
    MapLayer.prepareMapLayer = function () {
        alias002.call(this, MapLayer.prepareMapLayer);

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

    var alias003 = MapLayer.drawUnitLayer;
    MapLayer.drawUnitLayer = function () {
        alias003.call(this);

        this.drawUILayer();
    };

    /*-----------------------------------------------------------------------------------------------------------------
        戦闘時に毎回UIを描画することのないよう、キャッシュに描画しておく
    *----------------------------------------------------------------------------------------------------------------*/
    var alias004 = ClipingBattleContainer._createMapCache;
    ClipingBattleContainer._createMapCache = function () {
        var cache = alias004.call(this);

        MapLayer.drawUILayer();

        return cache;
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
        var curWT, defaultWT;

        if (unit == null || typeof unit.custom.curWT !== "number") {
            return;
        }

        curWT = unit.custom.curWT;
        defaultWT = WaitTurnOrderManager.calcDefaultWT(unit);

        x += GraphicsFormat.FACE_WIDTH + this._getInterval();
        y += 73;

        TextRenderer.drawSignText(x, y, "WT");
        NumberRenderer.drawNumber(x + 44, y - 1, curWT);
        TextRenderer.drawSignText(x + 60, y, "/");
        NumberRenderer.drawNumber(x + 98, y - 1, defaultWT);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        マップ上のユニットのキャラチップ上に行動順を描画する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias005 = MapLayer.drawUnitLayer;
    MapLayer.drawUnitLayer = function () {
        alias005.call(this);

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

        x += 0;
        y -= 4;

        NumberRenderer.drawRightNumber(x, y, orderNum);
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
        マップの右端2列にカーソルが侵入できないようにする（キーボード）
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
        } else if (xCursor > CurrentMap.getWidth() - 1 - 2) {
            xCursor = CurrentMap.getWidth() - 1 - 2;
        } else if (yCursor > CurrentMap.getHeight() - 1 - n) {
            yCursor = CurrentMap.getHeight() - 1 - n;
        } else {
            // カーソルが移動できたため、音を鳴らす
            this._playMovingSound();
        }

        MapView.setScroll(xCursor, yCursor);

        session.setMapCursorX(xCursor);
        session.setMapCursorY(yCursor);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        マップの右端2列にカーソルが侵入できないようにする（マウス）
    *----------------------------------------------------------------------------------------------------------------*/
    MouseControl._adjustMapCursor = function () {
        var session = root.getCurrentSession();
        var xCursor = Math.floor((root.getMouseX() + session.getScrollPixelX() - root.getViewportX()) / GraphicsFormat.MAPCHIP_WIDTH);
        var yCursor = Math.floor((root.getMouseY() + session.getScrollPixelY() - root.getViewportY()) / GraphicsFormat.MAPCHIP_HEIGHT);

        if (xCursor > CurrentMap.getWidth() - 1 - 2) {
            xCursor = CurrentMap.getWidth() - 1 - 2;
        }

        root.getCurrentSession().setMapCursorX(xCursor);
        root.getCurrentSession().setMapCursorY(yCursor);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        地形情報の表示位置を調整する
    *----------------------------------------------------------------------------------------------------------------*/
    MapParts.Terrain._getPositionX = function () {
        var dx = LayoutControl.getRelativeX(10) - 54;

        return root.getGameAreaWidth() - this._getWindowWidth() - dx - GraphicsFormat.MAPCHIP_WIDTH * 2;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        コンフィグの「敵ターンスキップ」「オートターンエンド」を非表示にする
    *----------------------------------------------------------------------------------------------------------------*/
    var alias006 = ConfigWindow._configureConfigItem;
    ConfigWindow._configureConfigItem = function (groupArray) {
        alias006.call(this, groupArray);
        var i, obj;
        var count = groupArray.length;

        for (i = count - 1; i >= 0; i--) {
            obj = groupArray[i];
            if (obj.getConfigItemTitle() === StringTable.Config_AutoTurnEnd) {
                root.log("AutoTurnEnd");
                groupArray.splice(i, 1);
            } else if (obj.getConfigItemTitle() === StringTable.Config_AutoTurnSkip) {
                root.log("AutoTurnSkip");
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
    StringTable.Signal_TotalWT = "TOTAL WT";

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

            if (totalWT == null) {
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

            if (totalWT != null) {
                customObject.mapTotalWT = totalWT;
            }
        }

        root.getLoadSaveManager().saveFile(index, this._screenParam.scene, this._screenParam.mapId, customObject);
    };
})();
