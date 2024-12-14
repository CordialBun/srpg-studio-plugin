/*-----------------------------------------------------------------------------------------------------------------

「ウェイトターンシステム」 Ver.3.02

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
Ver.3.00 2024/11/27 拡張機能「ディレイアタック」を追加。
                    行動順リストの表示形式をリスト表示とゲージ表示で切り替える機能を追加。
                    行動順リスト内のユニットのキャラチップの強調表示の仕様を変更。
                    各種画像や効果音を独自のものに変更できる機能を追加。
                    行動順リストのレイアウト設定の自由度を向上。
                    行動順リストを画面下に表示しているとき、戦闘やアイテム使用の予測ウィンドウが行動順リストと重なってしまう不具合を修正。
Ver.3.01 2024/12/01 ユニットの装備武器の重量のみ参照する設定のとき、ユニットが装備可能な武器を所持していないとエラー落ちする不具合を修正。
Ver.3.02 2024/12/14 時戻しシステムと併用時にマップセーブを行うと経過WTの記録や行動順リストの再構築が正常に動作しなくなる不具合を修正。
                    自軍ユニットのアタックターン中にそのユニットが撃破されたとき、WT値の更新が正常に動作しなくなる不具合を修正。


*----------------------------------------------------------------------------------------------------------------*/

/*-----------------------------------------------------------------------------------------------------------------
    設定項目
*----------------------------------------------------------------------------------------------------------------*/
// 時戻しシステムと併用する場合はtrue、しない場合はfalse
var REWIND_TIME_SYSTEM_COEXISTS = false;

// 重量計算でユニットの所持アイテム全てを参照する場合はtrue、装備武器のみ参照する場合はfalse
var IS_ALL_BELONGINGS_APPLICABLE = true;

// 行動順リストを画面右に表示する場合はtrue、画面下に表示する場合はfalse
var IS_WT_ORDER_LIST_LOCATED_RIGHT = true;

// 行動順リストの表示形式切り替えを有効にする場合はtrue、無効にする場合はfalse
// IS_WT_ORDER_LIST_LOCATED_RIGHTがfalseのとき、つまり行動順リストが画面下に表示されているときのみ適用される
var IS_SWITCHING_WT_ORDER_ALLOWED = false;

// コンフィグ「行動順ゲージのWT最大値」を有効にする場合はtrue、無効にする場合はfalse
// IS_WT_ORDER_LIST_LOCATED_RIGHTがfalse かつ IS_SWITCHING_WT_ORDER_ALLOWEDがtrueのときのみ適用される
// 無効にした場合、ゲージのWT最大値はWaitTurnOrderParam.MAX_WT_ARRAYの最後尾の数値が使われる
var IS_CONFIG_MAX_WT_ALLOWED = false;

// 行動順リストの描画に関するパラメータ
var WaitTurnOrderParam = {
    GRID_ROW_COUNT: 2, // マップの何列分を行動順リストの表示領域として使用するか
    SRC_UNIT_COLOR: 0x0000ff, // カーソル中または行動選択中のユニットの強調表示の色合い(カラーコード)
    DEST_UNIT_COLOR: 0xff0000, // 攻撃やアイテムの対象選択でカーソル中のユニットの強調表示の色合い(カラーコード)
    CHARGE_UNIT_COLOR: 0x008000, // チャージが完了していないユニットの強調表示の色合い(カラーコード)

    // 画面右に表示するときに使用するパラメータ
    RIGHT_BASE_ALIGN_X: 10, // 行動順リストのx座標補正値(px)
    RIGHT_BASE_ALIGN_Y: 0, // 行動順リストのy座標補正値(px)

    // 画面下に表示するときに使用するパラメータ
    BOTTOM_BASE_ALIGN_X: 0, // 行動順リストのx座標補正値(px)
    BOTTOM_BASE_ALIGN_Y: 10, // 行動順リストのy座標補正値(px)

    // リスト表示で使用するパラメータ
    ORDER_LIST_UNIT_NUM: 15, // 表示するユニットの数
    UNIT_INTERVAL: 32, // ユニットの表示間隔(px)

    // ゲージ表示で使用するパラメータ
    MAX_WT_ARRAY: [25, 50, 100], // WTの最大値 WT値がこれを超えているユニットはゲージに表示されない
    MAX_WT_STRING_ARRAY: ["25", "50", "100"], // コンフィグで表示する文字列
    MIN_WT_ALIGN_X: 15, // 最小WT(0)の数字のx座標補正値(px)
    MIN_WT_ALIGN_Y: 40, // 最小WT(0)の数字のy座標補正値(px)
    MAX_WT_ALIGN_X: 625, // 最大WTの数字のx座標補正値(px)
    MAX_WT_ALIGN_Y: 40, // 最大WTの数字のy座標補正値(px)
    ARROW_WIDTH: 600, // 矢印の横幅
    ARROW_ALIGN_X: 20, // 矢印のx座標補正値(px)
    ARROW_ALIGN_Y: 24, // 矢印のy座標補正値(px)
    SCALE_LINE_LENGTH: 10, // 目盛り線の長さ(px)
    SCALE_LINE_ALIGN_Y: 45, // 目盛り線のy座標補正値(px)
    SCALE_LINE_COLOR: 0x0095d9, // 目盛り線の色(カラーコード)
    UNIT_AREA_WIDTH: 563, // ユニットのキャラチップを表示する領域の横幅
    UNIT_AREA_ALIGN_X: 20, // ユニットのキャラチップを表示する領域のx座標補正値(px)
    UNIT_AREA_ALIGN_Y: -5, // ユニットのキャラチップを表示する領域のy座標補正値(px)
    CURSOR_ALIGN_X: 0, // カーソルのx座標補正値(px)
    CURSOR_ALIGN_Y: 36 // カーソルのy座標補正値(px)
};

// 画像に関するパラメータ
var WaitTurnImageParam = {
    IS_WT_ORDER_BACK_ORIGINAL: false, // 行動順リストの背景を独自の画像にする場合はtrue、デフォルトのままにする場合はfalse
    IS_AT_ICON_ORIGINAL: false, // ATアイコンを独自の画像にする場合はtrue、ランタイムのものを使用する場合はfalse
    MATERIAL_FOLDER_NAME: "WaitTurnImage", // 画像ファイルを配置するフォルダの名前
    BACK_FILE_NAME: "window.png", // 行動順リストの背景画像のファイル名
    ARROW_FILE_NAME: "arrow.png", // 矢印の画像のファイル名
    CURSOR_FILE_NAME: "cursor.png", // カーソルの画像のファイル名
    AT_ICON_FILE_NAME: "at_icon.png", // ATアイコンの画像のファイル名
    backImage: null, // 背景画像のデータ(変更不要)
    arrowImage: null, // 矢印の画像データ(変更不要)
    cursorImage: null, // カーソルの画像データ(変更不要)
    atIconImage: null // ATアイコンの画像データ(変更不要)
};

// 効果音に関するパラメータ
var WaitTurnSoundParam = {
    IS_PLAYER_AT_STARD_SOUND_ORIGINAL: false, // 自軍ユニットのAT開始時の効果音を独自のものにする場合はtrue、ランタイムのものを使用する場合はfalse
    IS_SWITCHING_WT_ORDER_SOUND_ORIGINAL: false, // 行動順リスト切り替え時の効果音を独自のものにする場合はtrue、ランタイムのものを使用する場合はfalse
    MATERIAL_FOLDER_NAME: "WaitTurnSound", // 音声ファイルを配置するフォルダの名前
    PLAYER_AT_START_SOUND_FILE_NAME: "player_at_start.mp3", // 自軍ユニットのAT開始時の効果音のファイル名
    SWITCHING_WT_ORDER_SOUND_FILE_NAME: "switch_wt_order.mp3" // 行動順リスト切り替え時の効果音のファイル名
};

// 目標確認画面やセーブ・ロード画面で表示する経過WTの項目名
StringTable.Signal_TotalWT = "経過WT";

// コンフィグの「行動順ゲージのWT最大値」の項目名
StringTable.Config_MaxWT = "行動順ゲージのWT最大値";

// コンフィグの「行動順ゲージのWT最大値」の説明文
StringTable.Config_MaxWTDescription = "行動順ゲージにおけるWTの最大値を決定します";

/*-----------------------------------------------------------------------------------------------------------------
    行動順リストを管理するオブジェクト
*----------------------------------------------------------------------------------------------------------------*/
var WaitTurnOrderManager = {
    _unitList: null,
    _orderList: null,
    _orderTopList: null,
    _isPredicting: false,

    // 初期化
    initialize: function () {
        this.update(true, false);
    },

    // アタックターン終了時
    attackTurnEnd: function () {
        var atUnit = this.getATUnit();

        this.setNextWT(atUnit);
        this.update(false, true);
    },

    // ロード時など、curWTはそのままでリストを再構築したいときに呼ぶ
    rebuildList: function () {
        this.update(false, false);
    },

    // ユニットリストと行動順リストを更新する
    update: function (isInitialize, isAttackTurnEnd) {
        var i, j, count, unit, atUnit, atCurWT, totalWT, defaultWT, obj;
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

        this._orderTopList = [];
        count = this._orderList.length;

        for (i = 0; i < count; i++) {
            obj = this._orderList[i];

            if (obj.isTop) {
                obj.unit.custom.orderNum = i + 1;
                this._orderTopList.push(obj);
            }
        }

        this.setPredicting(false);
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
        return this._orderTopList;
    },

    // ATユニットがとろうとしている行動内容に応じて予測行動順リストを取得する
    getPredictOrderList: function () {
        var sumWT, i, key, count, obj, unit, targetUnit, delayWT, predictDelayAttackCount;
        var atUnit = this.getATUnit();
        var orderList = this.getOrderList();
        var predictOrderList = [];
        var targetUnitDict = {};
        var pushCount = 0;

        if (atUnit == null || typeof atUnit.custom.curWT !== "number") {
            return null;
        }

        sumWT = atUnit.custom.curWT;

        count = orderList.length;
        for (i = 0; i < count; i++) {
            obj = orderList[i];
            unit = obj.unit;
            delayWT = unit.custom.delayWT;
            predictDelayAttackCount = unit.custom.predictDelayAttackCount;

            if (unit.getId() === atUnit.getId()) {
                continue;
            }

            if (typeof delayWT === "number" && typeof predictDelayAttackCount === "number") {
                targetUnitDict[unit.getId()] = unit;
                continue;
            }

            predictOrderList.push(obj);
            pushCount++;

            if (pushCount === WaitTurnOrderParam.ORDER_LIST_UNIT_NUM) {
                break;
            }
        }

        count = WaitTurnOrderParam.ORDER_LIST_UNIT_NUM;
        sumWT = atUnit.custom.curWT;

        // ATユニットの行動順予測
        for (i = 0; i < count; i++) {
            predictOrderList.push({
                unit: atUnit,
                wt: sumWT,
                isTop: i === 0
            });

            sumWT += i === 0 ? this.calcNextWT(atUnit) : this.calcUnitWT(unit);
        }

        // ディレイ等の対象となるユニットの行動順予測
        for (key in targetUnitDict) {
            targetUnit = targetUnitDict[key];
            sumWT = targetUnit.custom.curWT;
            delayWT = targetUnit.custom.delayWT;
            predictDelayAttackCount = unit.custom.predictDelayAttackCount;

            if (typeof delayWT === "number" && typeof predictDelayAttackCount === "number") {
                sumWT += Math.max(delayWT * predictDelayAttackCount, 0);
            }

            for (i = 0; i < count; i++) {
                predictOrderList.push({
                    unit: targetUnit,
                    wt: sumWT,
                    isTop: i === 0
                });

                sumWT += this.calcUnitWT(targetUnit);
            }
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

    getPredictOrderTopList: function () {
        var i, count, obj, unit, delayWT, predictDelayAttackCount;
        var atUnit = this.getATUnit();
        var orderTopList = this.getOrderTopList();
        var predictOrderTopList = [];

        if (atUnit === null || typeof atUnit.custom.curWT !== "number") {
            return null;
        }

        count = orderTopList.length;
        for (i = 0; i < count; i++) {
            obj = orderTopList[i];
            unit = obj.unit;
            delayWT = unit.custom.delayWT;
            predictDelayAttackCount = unit.custom.predictDelayAttackCount;

            // ATユニットの行動順予測
            if (unit.getId() === atUnit.getId()) {
                predictOrderTopList.push({
                    unit: unit,
                    wt: this.calcNextWT(unit),
                    isTop: true
                });
            }

            // ディレイ等の対象となるユニットの行動順予測
            if (typeof delayWT === "number" && typeof predictDelayAttackCount === "number") {
                predictOrderTopList.push({
                    unit: unit,
                    wt: unit.custom.curWT + Math.max(delayWT * predictDelayAttackCount, 0),
                    isTop: true
                });

                continue;
            }

            predictOrderTopList.push(obj);
        }

        predictOrderTopList = predictOrderTopList.sort(function (prevObj, nextObj) {
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

        return predictOrderTopList;
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
        delete unit.custom.hasCharged;
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

        if (typeof hasCharged === "boolean" && hasCharged && typeof chargeWT === "number") {
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

            if (item !== null) {
                totalWeight += item.getWeight();
            }
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

    isPredicting: function () {
        return this._isPredicting;
    },

    setPredicting: function (isPredicting) {
        this._isPredicting = isPredicting;
    }
};

(function () {
    /*-----------------------------------------------------------------------------------------------------------------
        ゲーム開始時にGraphicsManagerと各種画像を読み込む 
    *----------------------------------------------------------------------------------------------------------------*/
    var graphicsManager = null;

    var alias000 = SetupControl.setup;
    SetupControl.setup = function () {
        alias000.call(this);
        var baseList, fileName;
        var material = WaitTurnImageParam.MATERIAL_FOLDER_NAME;

        if (graphicsManager === null) {
            graphicsManager = root.getGraphicsManager();
        }

        if (WaitTurnImageParam.atIconImage == null) {
            if (WaitTurnImageParam.IS_AT_ICON_ORIGINAL) {
                fileName = WaitTurnImageParam.AT_ICON_FILE_NAME;
                WaitTurnImageParam.atIconImage = root.getMaterialManager().createImage(material, fileName);
            } else {
                baseList = root.getBaseData().getGraphicsResourceList(GraphicsType.ICON, true);
                WaitTurnImageParam.atIconImage = baseList.getCollectionData(1, 0);
            }
        }

        if (WaitTurnImageParam.backImage === null) {
            fileName = WaitTurnImageParam.BACK_FILE_NAME;
            WaitTurnImageParam.backImage = root.getMaterialManager().createImage(material, fileName);
        }

        if (WaitTurnImageParam.arrowImage === null) {
            fileName = WaitTurnImageParam.ARROW_FILE_NAME;
            WaitTurnImageParam.arrowImage = root.getMaterialManager().createImage(material, fileName);
        }

        if (WaitTurnImageParam.cursorImage === null) {
            fileName = WaitTurnImageParam.CURSOR_FILE_NAME;
            WaitTurnImageParam.cursorImage = root.getMaterialManager().createImage(material, fileName);
        }
    };

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
    var alias001 = ItemControl.updatePossessionItem;
    ItemControl.updatePossessionItem = function (unit) {
        alias001.call(this, unit);

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

                if (REWIND_TIME_SYSTEM_COEXISTS) {
                    RewindTimeManager.loadData();
                }
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
        var material, fileName;
        var turnType = root.getCurrentSession().getTurnType();
        var curMapCustom = root.getCurrentSession().getCurrentMapInfo().custom;
        var isWaitSelected = typeof curMapCustom.isWaitSelected === "boolean" ? curMapCustom.isWaitSelected : false;

        // 直前に待機コマンドが選択されているときに効果音が二重に再生されるのを防ぐ
        if (turnType === TurnType.PLAYER && !isWaitSelected) {
            if (WaitTurnSoundParam.IS_PLAYER_AT_STARD_SOUND_ORIGINAL) {
                material = WaitTurnSoundParam.MATERIAL_FOLDER_NAME;
                fileName = WaitTurnSoundParam.PLAYER_AT_START_SOUND_FILE_NAME;
                root.getMaterialManager().soundPlay(material, fileName, 0);
            } else {
                MediaControl.soundDirect("commandselect");
            }
        }

        delete curMapCustom.isWaitSelected;
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

        if (!StateControl.isTargetControllable(atUnit) || atUnit.isWait() || atUnit.getAliveState() !== AliveType.ALIVE) {
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
        ユニットコマンド選択中に行動順予測のフラグを立て、キャンセルされたらフラグを消す
    *----------------------------------------------------------------------------------------------------------------*/
    UnitCommand.Wait.isWaitCommand = true;

    var alias002 = UnitCommand._moveTitle;
    UnitCommand._moveTitle = function () {
        var weapon, isCharging;
        var result = alias002.call(this);
        var unit = this.getListCommandUnit();
        var mapCustom = root.getCurrentSession().getCurrentMapInfo().custom;
        var object = this._commandScrollbar.getObject();

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

        // ユニットコマンドをキャンセルしたときの処理
        if (result === MoveResult.END) {
            WaitTurnOrderManager.setPredicting(false);
            delete unit.custom.hasCharged;
            delete unit.custom.chargeWT;
            delete unit.custom.chargeWeaponId;
            delete unit.custom.chargeStartMapTotalWT;
        }

        return result;
    };

    var alias003 = PlayerTurn._moveArea;
    PlayerTurn._moveArea = function () {
        var result = alias003.call(this);
        var mode = this.getCycleMode();
        WaitTurnOrderManager.setPredicting(true);

        // ユニットコマンドが開かれる前の移動先選択の段階でキャンセルしたときの処理
        if (mode === PlayerTurnMode.MAP) {
            WaitTurnOrderManager.setPredicting(false);
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
    var alias004 = ScriptCall_AppearEventUnit;
    ScriptCall_AppearEventUnit = function (unit) {
        alias004.call(this, unit);
        var sceneType = root.getBaseScene();

        if (sceneType === SceneType.BATTLESETUP || sceneType === SceneType.FREE) {
            WaitTurnOrderManager.initUnitParam(unit);
            WaitTurnOrderManager.rebuildList();
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        援軍出現時、ユニットのカスパラを初期化して行動順リストを再構築する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias005 = ReinforcementChecker._appearUnit;
    ReinforcementChecker._appearUnit = function (pageData, x, y) {
        var unit = alias005.call(this, pageData, x, y);

        if (unit !== null) {
            WaitTurnOrderManager.initUnitParam(unit);
            WaitTurnOrderManager.rebuildList();
        }

        return unit;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ユニットの行動順を表示するMapParts.WTOrderを新たに作成
    *----------------------------------------------------------------------------------------------------------------*/
    var WTOrderMode = {
        LIST: 0,
        GAUGE: 1
    };

    MapParts.WTOrder = defineObject(BaseMapParts, {
        moveMapParts: function () {
            var mode = this.getCycleMode();
            var isSwitchingAllowed = !IS_WT_ORDER_LIST_LOCATED_RIGHT && IS_SWITCHING_WT_ORDER_ALLOWED;
            var isCursorMoveMode = SceneManager.getMapEditMode() === MapEditMode.CURSORMOVE;
            var isMapMode = SceneManager.getPlayerTurnCycleMode() === PlayerTurnMode.MAP;
            var isSetupEditMode = SceneManager.getBattleSetupCycleMode() === BattleSetupMode.SETUPEDIT;

            if (isSwitchingAllowed && InputControl.isOptionAction() && ((isMapMode && isCursorMoveMode) || isSetupEditMode)) {
                mode++;
                mode %= 2;
                this.playSwitchSound();
                this.changeCycleMode(mode);
            }

            return MoveResult.END;
        },

        drawMapParts: function () {
            var x, y;

            x = this._getPositionX();
            y = this._getPositionY();

            this._drawMain(x, y);
        },

        _drawMain: function (x, y) {
            var orderList;
            var mode = this.getCycleMode();

            if (mode === WTOrderMode.LIST) {
                if (WaitTurnOrderManager.isPredicting()) {
                    orderList = WaitTurnOrderManager.getPredictOrderList();
                } else {
                    orderList = WaitTurnOrderManager.getOrderList();
                }
            } else {
                if (WaitTurnOrderManager.isPredicting()) {
                    orderList = WaitTurnOrderManager.getPredictOrderTopList();
                } else {
                    orderList = WaitTurnOrderManager.getOrderTopList();
                }
            }

            if (orderList === null) {
                return;
            }

            this._drawBack(x, y);

            if (mode === WTOrderMode.GAUGE) {
                this._drawLine(x, y);
                this._drawArrow(x, y);
                this._drawWT(x, y);
                this._drawContentEx(x, y, orderList);
            } else {
                this._drawContent(x, y, orderList);
            }
        },

        _drawBack: function (x, y, textui) {
            var width, height, pic, color, alpha;

            if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                width = GraphicsFormat.MAPCHIP_WIDTH * WaitTurnOrderParam.GRID_ROW_COUNT;
                height = root.getGameAreaHeight();
            } else {
                width = root.getGameAreaWidth();
                height = GraphicsFormat.MAPCHIP_HEIGHT * WaitTurnOrderParam.GRID_ROW_COUNT;
            }

            if (WaitTurnImageParam.IS_WT_ORDER_BACK_ORIGINAL) {
                pic = WaitTurnImageParam.backImage;
                WindowRenderer.drawStretchWindow(x, y, width, height, pic);
            } else {
                color = 0x101010;
                alpha = 130;
                graphicsManager.fillRange(x, y, width, height, color, alpha);
            }
        },

        _drawLine: function (x, y) {
            var height = WaitTurnOrderParam.SCALE_LINE_LENGTH;
            var arrowWidth = WaitTurnOrderParam.ARROW_WIDTH - 36;
            var color = WaitTurnOrderParam.SCALE_LINE_COLOR;
            var alpha = 255;

            x += 36 + arrowWidth / 4;
            y += WaitTurnOrderParam.SCALE_LINE_ALIGN_Y;

            graphicsManager.fillRange(x, y, 1, height, color, alpha);
            x += arrowWidth / 4;
            graphicsManager.fillRange(x, y, 1, height, color, alpha);
            x += arrowWidth / 4;
            graphicsManager.fillRange(x, y, 1, height, color, alpha);
            x += arrowWidth / 4;
            graphicsManager.fillRange(x, y, 1, height, color, alpha);
        },

        _drawArrow: function (x, y, pic) {
            var height, picCache;
            var width = WaitTurnOrderParam.ARROW_WIDTH;
            var height = 60;
            var pic = WaitTurnImageParam.arrowImage;

            if (pic === null) {
                return;
            }

            height = pic.getHeight();
            picCache = CacheControl.getCacheGraphics(width, height, pic);

            if (picCache !== null) {
                if (picCache.isCacheAvailable()) {
                    picCache.draw(x, y);
                    return;
                }
            } else {
                picCache = CacheControl.createCacheGraphics(width, height, pic);
            }

            graphicsManager.setRenderCache(picCache);
            this._drawArrowInternal(0, 0, width, pic);
            graphicsManager.resetRenderCache();

            picCache.draw(x, y);
        },

        _drawWT: function (x, y) {
            var maxWTIndex = root.getExternalData().env.maxWTIndex;
            var maxWT = WaitTurnOrderParam.MAX_WT_ARRAY[maxWTIndex];
            var minWTAlignX = WaitTurnOrderParam.MIN_WT_ALIGN_X;
            var minWTAlignY = WaitTurnOrderParam.MIN_WT_ALIGN_Y;
            var maxWTAlignX = WaitTurnOrderParam.MAX_WT_ALIGN_X;
            var maxWTAlignY = WaitTurnOrderParam.MAX_WT_ALIGN_Y;

            NumberRenderer.drawNumber(x + minWTAlignX, y + minWTAlignY, 0);
            NumberRenderer.drawNumber(x + maxWTAlignX, y + maxWTAlignY, maxWT);
        },

        _drawArrowInternal: function (x, y, width, pic) {
            var i, alignX;
            var picWidth = pic.getWidth();
            var picHeight = pic.getHeight();
            var frameWidth = picWidth / 3;
            var bodyWidth = picWidth - frameWidth * 2;
            var maxWidth = width;
            var arrowBodyWidth = maxWidth - frameWidth * 2;

            x += WaitTurnOrderParam.ARROW_ALIGN_X;
            y += WaitTurnOrderParam.ARROW_ALIGN_Y;

            pic.drawParts(x, y, 0, 0, frameWidth, picHeight);

            for (i = frameWidth; i < maxWidth - frameWidth; i++) {
                alignX = Math.floor((bodyWidth * i) / arrowBodyWidth);
                pic.drawParts(x + i, y, frameWidth + alignX, 0, 1, picHeight);
            }

            pic.drawParts(x + maxWidth - frameWidth, y, picWidth - frameWidth, 0, frameWidth, picHeight);
        },

        _drawContent: function (x, y, orderList) {
            var i, count, obj, unit, unitRenderParam;

            if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                x += WaitTurnOrderParam.RIGHT_BASE_ALIGN_X;
                y += WaitTurnOrderParam.RIGHT_BASE_ALIGN_Y;
            } else {
                x += WaitTurnOrderParam.BOTTOM_BASE_ALIGN_X;
                y += WaitTurnOrderParam.BOTTOM_BASE_ALIGN_Y;
            }

            count = Math.min(orderList.length, WaitTurnOrderParam.ORDER_LIST_UNIT_NUM);
            for (i = 0; i < count; i++) {
                obj = orderList[i];
                unit = obj.unit;

                if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                    if (i === 0) {
                        this._drawIcon(x - 10, y + 5);
                    } else {
                        NumberRenderer.drawNumber(x, y + 4, i + 1);
                    }
                } else {
                    if (i === 0) {
                        this._drawIcon(x + 5, y - 10);
                    } else {
                        if (i + 1 < 10) {
                            NumberRenderer.drawNumber(x + 11, y - 10, i + 1);
                        } else {
                            NumberRenderer.drawNumber(x + 15, y - 10, i + 1);
                        }
                    }
                }

                unitRenderParam = StructureBuilder.buildUnitRenderParam();
                unitRenderParam.isSrcUnit = this._isSrcUnit(unit);
                unitRenderParam.isDestUnit = this._isDestUnit(unit);
                unitRenderParam.isChargingNotFinished = this._isChargingNotFinished(unit);

                if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                    UnitRenderer.drawDefaultUnit(unit, x + 16, y, unitRenderParam);
                } else {
                    UnitRenderer.drawDefaultUnit(unit, x, y + 16, unitRenderParam);
                }

                if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                    y += WaitTurnOrderParam.UNIT_INTERVAL;
                } else {
                    x += WaitTurnOrderParam.UNIT_INTERVAL;
                }
            }
        },

        _drawContentEx: function (x, y, orderList) {
            var i, count, obj, unit, curWT, alighX, unitRenderParam;
            var maxWTIndex = root.getExternalData().env.maxWTIndex;
            var maxWT = WaitTurnOrderParam.MAX_WT_ARRAY[maxWTIndex];
            var maxWidth = WaitTurnOrderParam.UNIT_AREA_WIDTH;
            var srcUnitObjArray = [];
            var destUnitObjArray = [];
            var cursorPic = WaitTurnImageParam.cursorImage;
            var cursorAlignX = WaitTurnOrderParam.CURSOR_ALIGN_X;
            var cursorAlignY = WaitTurnOrderParam.CURSOR_ALIGN_Y;

            if (cursorPic === null) {
                return;
            }

            x += WaitTurnOrderParam.UNIT_AREA_ALIGN_X;
            y += WaitTurnOrderParam.UNIT_AREA_ALIGN_Y;

            count = orderList.length;
            for (i = count - 1; i >= 0; i--) {
                obj = orderList[i];
                unit = obj.unit;
                curWT = obj.wt;

                if (curWT > maxWT) {
                    continue;
                }

                alighX = Math.floor((maxWidth * curWT) / maxWT);

                unitRenderParam = StructureBuilder.buildUnitRenderParam();
                unitRenderParam.isSrcUnit = this._isSrcUnit(unit);
                unitRenderParam.isDestUnit = this._isDestUnit(unit);
                unitRenderParam.isChargingNotFinished = this._isChargingNotFinished(unit);

                if (unitRenderParam.isSrcUnit) {
                    srcUnitObjArray.push(obj);
                    continue;
                } else if (unitRenderParam.isDestUnit) {
                    destUnitObjArray.push(obj);
                    continue;
                }

                cursorPic.draw(x + alighX + cursorAlignX, y + cursorAlignY);
                UnitRenderer.drawDefaultUnit(unit, x + alighX, y + 16, unitRenderParam);
            }

            // 強調表示するユニットは後から描画する
            count = destUnitObjArray.length;
            for (i = count - 1; i >= 0; i--) {
                obj = destUnitObjArray[i];
                unit = obj.unit;
                curWT = obj.wt;
                alighX = Math.floor((maxWidth * curWT) / maxWT);

                unitRenderParam = StructureBuilder.buildUnitRenderParam();
                unitRenderParam.isSrcUnit = false;
                unitRenderParam.isDestUnit = true;
                unitRenderParam.isChargingNotFinished = false;

                cursorPic.draw(x + alighX + cursorAlignX, y + cursorAlignY);
                UnitRenderer.drawDefaultUnit(unit, x + alighX, y + 16, unitRenderParam);
            }

            count = srcUnitObjArray.length;
            for (i = count - 1; i >= 0; i--) {
                obj = srcUnitObjArray[i];
                unit = obj.unit;
                curWT = obj.wt;
                alighX = Math.floor((maxWidth * curWT) / maxWT);

                unitRenderParam = StructureBuilder.buildUnitRenderParam();
                unitRenderParam.isSrcUnit = true;
                unitRenderParam.isDestUnit = false;
                unitRenderParam.isChargingNotFinished = false;

                cursorPic.draw(x + alighX + cursorAlignX, y + cursorAlignY);
                UnitRenderer.drawDefaultUnit(unit, x + alighX, y + 16, unitRenderParam);
            }
        },

        _drawIcon: function (x, y) {
            if (WaitTurnImageParam.IS_AT_ICON_ORIGINAL) {
                WaitTurnImageParam.atIconImage.draw(x, y);
            } else {
                WaitTurnImageParam.atIconImage.drawParts(x, y, 0, 24 * 3, 24, 24);
            }
        },

        _isSrcUnit: function (unit) {
            var srcUnit, curSession;

            if (WaitTurnOrderManager.isPredicting()) {
                srcUnit = WaitTurnOrderManager.getATUnit();
            } else {
                curSession = root.getCurrentSession();
                srcUnit = PosChecker.getUnitFromPos(curSession.getMapCursorX(), curSession.getMapCursorY());
            }

            return srcUnit !== null && unit.getId() === srcUnit.getId();
        },

        _isDestUnit: function (unit) {
            var destUnit, curSession;

            if (WaitTurnOrderManager.isPredicting()) {
                curSession = root.getCurrentSession();
                destUnit = PosChecker.getUnitFromPos(curSession.getMapCursorX(), curSession.getMapCursorY());
            } else {
                destUnit = null;
            }

            return destUnit !== null && unit.getId() === destUnit.getId();
        },

        _isChargingNotFinished: function (unit) {
            var chargeWT, chargeStartMapTotalWT, mapTotalWT;
            var isCharging = unit.custom.isCharging;

            if (typeof isCharging !== "boolean" || !isCharging) {
                return false;
            }

            chargeWT = unit.custom.chargeWT;
            chargeStartMapTotalWT = unit.custom.chargeStartMapTotalWT;
            mapTotalWT = WaitTurnOrderManager.getMapTotalWT();

            if (typeof chargeWT !== "number" || typeof chargeStartMapTotalWT !== "number" || typeof mapTotalWT !== "number") {
                return false;
            }

            return mapTotalWT < chargeStartMapTotalWT + chargeWT;
        },

        _getPositionX: function () {
            if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                return root.getGameAreaWidth() - GraphicsFormat.MAPCHIP_WIDTH * WaitTurnOrderParam.GRID_ROW_COUNT;
            }

            return 0;
        },

        _getPositionY: function () {
            if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
                return 0;
            }

            return root.getGameAreaHeight() - GraphicsFormat.MAPCHIP_HEIGHT * WaitTurnOrderParam.GRID_ROW_COUNT;
        },

        playSwitchSound: function () {
            var category, name;

            if (WaitTurnSoundParam.IS_SWITCHING_WT_ORDER_SOUND_ORIGINAL) {
                category = WaitTurnSoundParam.MATERIAL_FOLDER_NAME;
                name = WaitTurnSoundParam.SWITCHING_WT_ORDER_SOUND_FILE_NAME;
                root.getMaterialManager().soundPlay(category, name, 0);
            } else {
                MediaControl.soundDirect("commandselect");
            }
        }
    });

    /*-----------------------------------------------------------------------------------------------------------------
        行動順リストの切り替え用にmodeを取得する関数を追加する
    *----------------------------------------------------------------------------------------------------------------*/
    SceneManager.getBattleSetupCycleMode = function () {
        if (this._sceneType !== SceneType.BATTLESETUP) {
            return 0;
        }

        return this._activeAcene.getCycleMode();
    };

    SceneManager.getPlayerTurnCycleMode = function () {
        if (this._sceneType !== SceneType.FREE) {
            return 0;
        }

        return this._activeAcene.getPlayerTurnCycleMode();
    };

    SceneManager.getMapEditMode = function () {
        if (this._sceneType !== SceneType.FREE) {
            return 0;
        }

        return this._activeAcene.getMapEditMode();
    };

    FreeAreaScene.getPlayerTurnCycleMode = function () {
        if (this._playerTurnObject === null) {
            return 0;
        }

        return this._playerTurnObject.getCycleMode();
    };

    FreeAreaScene.getMapEditMode = function () {
        if (this._playerTurnObject === null) {
            return 0;
        }

        return this._playerTurnObject.getMapEditMode();
    };

    PlayerTurn.getMapEditMode = function () {
        if (this._mapEdit === null) {
            return 0;
        }

        return this._mapEdit.getCycleMode();
    };

    /*-----------------------------------------------------------------------------------------------------------------
        行動順リストの切り替えを有効にする場合はCキーでユニットメニューが開かないようにする
    *----------------------------------------------------------------------------------------------------------------*/
    var alias006 = MapEdit._optionAction;
    MapEdit._optionAction = function (unit) {
        if (!IS_WT_ORDER_LIST_LOCATED_RIGHT && IS_SWITCHING_WT_ORDER_ALLOWED) {
            return MapEditResult.NONE;
        }

        return alias006.call(this, unit);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        行動順リスト内のユニットのキャラチップを強調表示するための関数を追加する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias007 = UnitRenderer.drawCharChip;
    UnitRenderer.drawCharChip = function (x, y, unitRenderParam) {
        var isSrcUnit = typeof unitRenderParam.isSrcUnit === "boolean" && unitRenderParam.isSrcUnit;
        var isDestUnit = typeof unitRenderParam.isDestUnit === "boolean" && unitRenderParam.isDestUnit;
        var isChargingNotFinished = typeof unitRenderParam.isChargingNotFinished === "boolean" && unitRenderParam.isChargingNotFinished;

        if (isSrcUnit || isDestUnit || isChargingNotFinished) {
            this.drawCharChipEx(x, y, unitRenderParam);
        } else {
            alias007.call(this, x, y, unitRenderParam);
        }
    };

    UnitRenderer.drawCharChipEx = function (x, y, unitRenderParam) {
        var dx, dy, dxSrc, dySrc;
        var directionArray = [4, 1, 2, 3, 0];
        var handle = unitRenderParam.handle;
        var width = GraphicsFormat.CHARCHIP_WIDTH;
        var height = GraphicsFormat.CHARCHIP_HEIGHT;
        var xSrc = handle.getSrcX() * (width * 3);
        var ySrc = handle.getSrcY() * (height * 5);
        var pic = this._getGraphics(handle, unitRenderParam.colorIndex);
        var tileSize = this._getTileSize(unitRenderParam);
        var isSrcUnit = unitRenderParam.isSrcUnit;
        var isDestUnit = unitRenderParam.isDestUnit;
        var isChargingNotFinished = unitRenderParam.isChargingNotFinished;

        if (pic === null) {
            return;
        }

        dx = Math.floor((width - tileSize.width) / 2);
        dy = Math.floor((height - tileSize.height) / 2);
        dxSrc = unitRenderParam.animationIndex;
        dySrc = directionArray[unitRenderParam.direction];

        pic.setAlpha(unitRenderParam.alpha);
        pic.setDegree(unitRenderParam.degree);
        pic.setReverse(unitRenderParam.isReverse);

        if (typeof isSrcUnit === "boolean" && isSrcUnit) {
            pic.setColor(WaitTurnOrderParam.SRC_UNIT_COLOR, 120);
        } else if (typeof isDestUnit === "boolean" && isDestUnit) {
            pic.setColor(WaitTurnOrderParam.DEST_UNIT_COLOR, 120);
        } else if (typeof isChargingNotFinished === "boolean" && isChargingNotFinished) {
            pic.setColor(WaitTurnOrderParam.CHARGE_UNIT_COLOR, 120);
        }

        try {
            pic.drawStretchParts(x - dx, y - dy, width, height, xSrc + dxSrc * width, ySrc + dySrc * height, width, height);
        } catch (e) {
            // xとyが不正な値である場合、スタックオーバーフローでここが実行される。
            // draw系メソッドは定期的に呼ばれるため、エラー出力は、root.msg('')ではなく、root.log('');が向いている。
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        MapLayerクラスに_mapPartsArrayを追加し、MapParts.WTOrderを入れる
    *----------------------------------------------------------------------------------------------------------------*/
    var alias008 = MapLayer.prepareMapLayer;
    MapLayer.prepareMapLayer = function () {
        alias008.call(this, MapLayer.prepareMapLayer);

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

    var alias009 = MapLayer.drawUnitLayer;
    MapLayer.drawUnitLayer = function () {
        alias009.call(this);

        this.drawUILayer();
    };

    /*-----------------------------------------------------------------------------------------------------------------
        MapLayerクラスにmoveUILayerを追加する
    *----------------------------------------------------------------------------------------------------------------*/
    MapLayer.moveUILayer = function () {
        var i;
        var count = this._mapPartsArray.length;

        for (i = 0; i < count; i++) {
            this._mapPartsArray[i].moveMapParts();
        }
    };

    var alias010 = MapLayer.moveMapLayer;
    MapLayer.moveMapLayer = function () {
        this.moveUILayer();

        return alias010.call(this);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        戦闘時に毎回UIを描画することのないよう、キャッシュに描画しておく
    *----------------------------------------------------------------------------------------------------------------*/
    var alias011 = ClipingBattleContainer._createMapCache;
    ClipingBattleContainer._createMapCache = function () {
        var cache = alias011.call(this);

        MapLayer.drawUILayer();

        return cache;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ユニットメニューにWT値を表示する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias012 = UnitMenuTopWindow.drawWindowContent;
    UnitMenuTopWindow.drawWindowContent = function (x, y) {
        alias012.call(this, x, y);

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
    var alias013 = MapLayer.drawUnitLayer;
    MapLayer.drawUnitLayer = function () {
        alias013.call(this);

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
            this._drawIcon(x - 4, y - 4);
        } else {
            NumberRenderer.drawRightNumber(x, y - 4, orderNum);
        }
    };

    MapLayer._drawIcon = function (x, y) {
        if (WaitTurnImageParam.IS_AT_ICON_ORIGINAL) {
            WaitTurnImageParam.atIconImage.drawStretchParts(x, y, 20, 20, 0, 0, 24, 24);
        } else {
            WaitTurnImageParam.atIconImage.drawStretchParts(x, y, 20, 20, 0, 24 * 3, 24, 24);
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
        行動順リストの表示領域にカーソルが侵入できないようにする（キーボード）
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
        } else if (IS_WT_ORDER_LIST_LOCATED_RIGHT && xCursor > CurrentMap.getWidth() - 1 - WaitTurnOrderParam.GRID_ROW_COUNT) {
            xCursor = CurrentMap.getWidth() - 1 - WaitTurnOrderParam.GRID_ROW_COUNT;
        } else if (!IS_WT_ORDER_LIST_LOCATED_RIGHT && xCursor > CurrentMap.getWidth() - 1 - n) {
            xCursor = CurrentMap.getWidth() - 1 - n;
        } else if (IS_WT_ORDER_LIST_LOCATED_RIGHT && yCursor > CurrentMap.getHeight() - 1 - n) {
            yCursor = CurrentMap.getHeight() - 1 - n;
        } else if (!IS_WT_ORDER_LIST_LOCATED_RIGHT && yCursor > CurrentMap.getHeight() - 1 - WaitTurnOrderParam.GRID_ROW_COUNT) {
            yCursor = CurrentMap.getHeight() - 1 - WaitTurnOrderParam.GRID_ROW_COUNT;
        } else {
            // カーソルが移動できたため、音を鳴らす
            this._playMovingSound();
        }

        MapView.setScroll(xCursor, yCursor);

        session.setMapCursorX(xCursor);
        session.setMapCursorY(yCursor);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        行動順リストの表示領域にカーソルが侵入できないようにする（マウス）
    *----------------------------------------------------------------------------------------------------------------*/
    MouseControl._adjustMapCursor = function () {
        var session = root.getCurrentSession();
        var xCursor = Math.floor((root.getMouseX() + session.getScrollPixelX() - root.getViewportX()) / GraphicsFormat.MAPCHIP_WIDTH);
        var yCursor = Math.floor((root.getMouseY() + session.getScrollPixelY() - root.getViewportY()) / GraphicsFormat.MAPCHIP_HEIGHT);

        if (IS_WT_ORDER_LIST_LOCATED_RIGHT && xCursor > CurrentMap.getWidth() - 1 - WaitTurnOrderParam.GRID_ROW_COUNT) {
            xCursor = CurrentMap.getWidth() - 1 - WaitTurnOrderParam.GRID_ROW_COUNT;
        } else if (!IS_WT_ORDER_LIST_LOCATED_RIGHT && yCursor > CurrentMap.getHeight() - 1 - WaitTurnOrderParam.GRID_ROW_COUNT) {
            yCursor = CurrentMap.getHeight() - 1 - WaitTurnOrderParam.GRID_ROW_COUNT;
        }

        root.getCurrentSession().setMapCursorX(xCursor);
        root.getCurrentSession().setMapCursorY(yCursor);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        行動順リストの表示領域にユニットの移動範囲や攻撃範囲を示すパネルを表示しないようにする
    *----------------------------------------------------------------------------------------------------------------*/
    MapChipLight.setIndexArray = function (indexArray) {
        this._indexArray = CDB_rebuildIndexArray(indexArray);
    };

    var alias014 = MarkingPanel.updateMarkingPanel;
    MarkingPanel.updateMarkingPanel = function () {
        alias014.call(this);
        this._indexArray = CDB_rebuildIndexArray(this._indexArray);
        this._indexArrayWeapon = CDB_rebuildIndexArray(this._indexArrayWeapon);
    };

    var alias015 = MarkingPanel.updateMarkingPanelFromUnit;
    MarkingPanel.updateMarkingPanelFromUnit = function (unit) {
        alias015.call(this, unit);
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
            yMax -= GraphicsFormat.MAPCHIP_HEIGHT * WaitTurnOrderParam.GRID_ROW_COUNT;
        }

        return y > d ? yMin : yMax;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        地形情報の表示位置を調整する
    *----------------------------------------------------------------------------------------------------------------*/
    MapParts.Terrain._getPositionX = function () {
        var dx = LayoutControl.getRelativeX(10) - 54;

        if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
            return root.getGameAreaWidth() - this._getWindowWidth() - dx - GraphicsFormat.MAPCHIP_WIDTH * WaitTurnOrderParam.GRID_ROW_COUNT;
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
                return root.getGameAreaHeight() - this._getWindowHeight() - yBase - GraphicsFormat.MAPCHIP_HEIGHT * WaitTurnOrderParam.GRID_ROW_COUNT;
            }
        } else {
            return yBase;
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        戦闘予測画面の表示位置を調整する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias016 = PosMenu.getPositionWindowY;
    PosMenu.getPositionWindowY = function () {
        var height, maxHeight, wtOrderHeight;
        var y = alias016.call(this);

        if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
            return y;
        }

        height = this.getTotalWindowHeight();
        maxHeight = root.getGameAreaHeight();
        wtOrderHeight = GraphicsFormat.MAPCHIP_HEIGHT * WaitTurnOrderParam.GRID_ROW_COUNT;

        if (y + height > maxHeight - wtOrderHeight) {
            y -= y + height - (maxHeight - wtOrderHeight) + 20;
        }

        return y;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ユニットコマンドの表示位置を調整する
    *----------------------------------------------------------------------------------------------------------------*/
    LayoutControl._getNormalizeX = function (x, width, dx) {
        var maxWidth = root.getGameAreaWidth();

        if (IS_WT_ORDER_LIST_LOCATED_RIGHT) {
            maxWidth -= GraphicsFormat.MAPCHIP_WIDTH * WaitTurnOrderParam.GRID_ROW_COUNT;
        }

        return this._getNormalizeValue(x, width, maxWidth, dx);
    };

    LayoutControl._getNormalizeY = function (y, height, dy) {
        var maxHeight = root.getGameAreaHeight();

        if (!IS_WT_ORDER_LIST_LOCATED_RIGHT) {
            maxHeight -= GraphicsFormat.MAPCHIP_HEIGHT * WaitTurnOrderParam.GRID_ROW_COUNT;
        }

        return this._getNormalizeValue(y, height, maxHeight, dy);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        コンフィグの「敵ターンスキップ」「オートターンエンド」を非表示にし、「行動順ゲージのWT最大値」を追加する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias017 = ConfigWindow._configureConfigItem;
    ConfigWindow._configureConfigItem = function (groupArray) {
        alias017.call(this, groupArray);
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

        if (!IS_WT_ORDER_LIST_LOCATED_RIGHT && IS_SWITCHING_WT_ORDER_ALLOWED && IS_CONFIG_MAX_WT_ALLOWED) {
            groupArray.push(ConfigItem.MaxWT);
        }
    };

    ConfigItem.MaxWT = defineObject(BaseConfigtItem, {
        selectFlag: function (index) {
            root.getExternalData().env.maxWTIndex = index;
        },

        getFlagValue: function () {
            if (typeof root.getExternalData().env.maxWTIndex !== "number") {
                return 0;
            }

            return root.getExternalData().env.maxWTIndex;
        },

        getFlagCount: function () {
            return WaitTurnOrderParam.MAX_WT_ARRAY.length;
        },

        getConfigItemTitle: function () {
            return StringTable.Config_MaxWT;
        },

        getConfigItemDescription: function () {
            return StringTable.Config_MaxWTDescription;
        },

        getObjectArray: function () {
            return WaitTurnOrderParam.MAX_WT_STRING_ARRAY;
        }
    });

    var alias018 = ScriptCall_Setup;
    ScriptCall_Setup = function () {
        alias018.call(this);
        var env = root.getExternalData().env;

        if (typeof env.maxWTIndex !== "number") {
            env.maxWTIndex = WaitTurnOrderParam.MAX_WT_ARRAY.length - 1;
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

        if (REWIND_TIME_SYSTEM_COEXISTS && root.getBaseScene() === SceneType.FREE) {
            RewindTimeManager.saveData();
        }

        root.getLoadSaveManager().saveFile(index, this._screenParam.scene, this._screenParam.mapId, customObject);

        if (REWIND_TIME_SYSTEM_COEXISTS && root.getBaseScene() === SceneType.FREE) {
            RewindTimeManager.deleteGlobalCustomProp("recordArrayJSON");
            RewindTimeManager.deleteGlobalCustomProp("beforeChangedMapChipDictJSON");
            RewindTimeManager.deleteGlobalCustomProp("beforeChangedLayerMapChipDictJSON");
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        武器の情報ウィンドウにチャージやディレイの項目を追加する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias019 = ItemInfoWindow._configureWeapon;
    ItemInfoWindow._configureWeapon = function (groupArray) {
        alias019.call(this, groupArray);

        groupArray.appendObject(ItemSentence.ChargeDelayWT);
        groupArray.appendObject(ItemSentence.ChargeWeapon);
        groupArray.appendObject(ItemSentence.DelayWeapon);
    };

    ItemSentence.ChargeDelayWT = defineObject(BaseItemSentence, {
        drawItemSentence: function (x, y, item) {
            var textui = this.getTextUI();
            var color = ColorValue.KEYWORD;
            var font = textui.getFont();

            if (typeof CHARGE_TIME_TEXT === "string" && typeof item.custom.chargeWT === "number") {
                TextRenderer.drawKeywordText(x, y, CHARGE_TIME_TEXT, -1, color, font);
                x += ItemInfoRenderer.getSpaceX();
                y -= 1;

                NumberRenderer.drawRightNumber(x, y, item.custom.chargeWT);

                x += 42;
            }

            if (typeof DELAY_TIME_TEXT === "string" && typeof item.custom.delayWT === "number") {
                TextRenderer.drawKeywordText(x, y, DELAY_TIME_TEXT, -1, color, font);
                x += ItemInfoRenderer.getSpaceX();
                y -= 1;

                NumberRenderer.drawRightNumber(x, y, item.custom.delayWT);
            }
        },

        getItemSentenceCount: function (item) {
            var chargeWT = item.custom.chargeWT;
            var delayWT = item.custom.delayWT;
            var chargeParamExist = typeof chargeWT === "number" && typeof CHARGE_TIME_TEXT === "string";
            var delayParamExist = typeof delayWT === "number" && typeof DELAY_TIME_TEXT === "string";

            if (chargeParamExist || delayParamExist) {
                return 1;
            }

            return 0;
        },

        getTextUI: function () {
            return root.queryTextUI("default_window");
        }
    });

    ItemSentence.ChargeWeapon = defineObject(BaseItemSentence, {
        drawItemSentence: function (x, y, item) {
            if (this.getItemSentenceCount(item) === 1) {
                ItemInfoRenderer.drawKeyword(x, y, ChargeItemSentenceString[item.custom.chargeType]);
            }
        },

        getItemSentenceCount: function (item) {
            var chargeType = item.custom.chargeType;

            if (typeof ChargeItemSentenceString === "undefined" || typeof chargeType !== "string") {
                return 0;
            }

            return 1;
        },

        getTextUI: function () {
            return root.queryTextUI("default_window");
        }
    });

    ItemSentence.DelayWeapon = defineObject(BaseItemSentence, {
        drawItemSentence: function (x, y, item) {
            if (this.getItemSentenceCount(item) === 1) {
                ItemInfoRenderer.drawKeyword(x, y, DELAY_WEAPON_SENTENCE_TEXT);
            }
        },

        getItemSentenceCount: function (item) {
            var delayWT = item.custom.delayWT;

            if (typeof DELAY_WEAPON_SENTENCE_TEXT !== "string" || typeof delayWT !== "number") {
                return 0;
            }

            return 1;
        },

        getTextUI: function () {
            return root.queryTextUI("default_window");
        }
    });
})();
