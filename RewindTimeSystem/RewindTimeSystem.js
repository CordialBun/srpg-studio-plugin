/*-----------------------------------------------------------------------------------------------------------------

「時戻しプラグイン」 Ver.1.21


【概要】
本プラグインを導入すると、マップコマンド「時戻し」が使用できます。
※コマンド名は変更可。以降、便宜上「時戻し」と呼びます。

事前に設定を行うことで「自軍フェイズ開始時」「自軍ユニット行動後」にユニットやセッションの状態が履歴に残り、
時戻しコマンドで過去の時点まで巻き戻すことができるようになります。

また、敗北条件を満たしたときにもゲームオーバーシーンへ移行する前に時戻し画面が表示され、
時戻しを行うことでゲームオーバーを回避することもできます。
（時戻しの残り回数が0の場合やキャンセルで時戻し画面を閉じた場合などはそのままゲームオーバーになります）

履歴は個々のセーブファイル内に保存されるので、セーブファイルを複数管理している場合も履歴の衝突などは起こらず、
各々のデータで時戻しが使用できます。


【使い方】
下記のURLからマニュアルを参照してください。
https://github.com/CordialBun/srpg-studio-plugin/tree/master/RewindTimeSystem#readme


【作者】
さんごぱん(https://twitter.com/CordialBun)

【対応バージョン】
SRPG Studio version:1.294

【利用規約】
・利用はSRPG Studioを使ったゲームに限ります。
・商用、非商用問わず利用可能です。
・改変等、問題ありません。
・再配布OKです。ただしコメント文中に記載されている作者名は消さないでください。
・SRPG Studioの利用規約は遵守してください。

【更新履歴】
Ver.1.0  2024/5/19  初版
Ver.1.1  2024/5/20  古いバージョンのSRPG Studioを使用しているとレコード作成時にエラー落ちする不具合を修正。
                    乱数取得をroot.getRandomNumber()で行っていた箇所をProbability.getRandomNumber()に変更。
Ver.1.2  2024/5/21  時戻しの上限回数を難易度毎に設定できる機能を追加。
Ver.1.21 2024/5/22  時戻し画面でのレコード選択でマウス操作が使えない不具合を修正。
Ver.1.30 2024/11/03 相対ターンの巻き戻しに対応。
                    場所・会話イベントと行動回復コマンドに対応する文字列を設定できる機能を追加。


*----------------------------------------------------------------------------------------------------------------*/

/*-----------------------------------------------------------------------------------------------------------------
    設定項目
*----------------------------------------------------------------------------------------------------------------*/
// 時戻しコマンドの名称
var REWIND_COMMAND_NAME = "時戻し";
// 時戻しコマンドを上から何番目に表示するか
// 0が一番上
var REWIND_COMMAND_INDEX = 0;

// 各難易度の1マップあたりの時戻しの上限回数
// 0未満の数値を指定した場合は無制限として扱う
var RewindCountLimit = {
    0: -1, // ID:0の難易度
    1: 10, // ID:1の難易度
    2: 3 // ID:2の難易度
};

// 時戻しを実行するか確認するメッセージ
var REWIND_EXEC_QUESTION_MESSAGE = "巻き戻しますか？";
// ゲームオーバー前の時戻し画面でのキャンセル時に表示するメッセージ
// \nで改行できる 1行が長いと表示がおかしくなるので適宜改行することを推奨
var REWIND_CANCEL_QUESTION_MESSAGE = "時戻しを使わないと敗北し、\nゲームオーバーとなります。\nよろしいですか？";
// 時戻しの残り回数を表す文字列
var REMAIN_REWIND_COUNT_TEXT = "残り回数";
// 時戻しの残り回数が無制限のときに数値の代わりに表示する文字列
var REMAIN_COUNT_LIMITLESS = "∞";

// 時戻しコマンド表示のグローバルスイッチID
var IS_REWIND_COMMAND_DISPLAYABLE_SWITCH_ID = 0;
// 時戻しコマンド使用可のグローバルスイッチID
var CAN_REWIND_SWITCH_ID = 1;
// 自軍ユニット行動後判定のグローバルスイッチID
var APPEND_RECORD_SWITCH_ID = 2;
// ゲームオーバー判定のグローバルスイッチのID
var IS_GAME_OVER_SWITCH_ID = 3;

// マップのカスパラを巻き戻す場合はtrue、巻き戻さない場合はfalse
var IS_ALLOWED_REWIND_MAP_CUSTOM = true;
// ユニットのカスパラを巻き戻す場合はtrue、巻き戻さない場合はfalse
var IS_ALLOWED_REWIND_UNIT_CUSTOM = true;

// 時戻し画面のレコード一覧ウィンドウのx座標
var REWIND_TITLE_WINDOW_X = 40;
// 時戻し画面のレコード一覧ウィンドウのy座標
var REWIND_TITLE_WINDOW_Y = 40;
// 時戻し画面の残り回数ウィンドウのx座標
var REWIND_COUNT_WINDOW_X = 40;
// 時戻し画面の残り回数ウィンドウのy座標
var REWIND_COUNT_WINDOW_Y = 400;

// 時戻し画面に一度に表示するレコードの行数
var REWIND_TITLE_RAW_LIMIT = 10;
// 時戻し画面表示中のBGM音量の割合
// 元の音量の50%にする場合は0.5、120%にする場合は1.2、という風に設定する
var MUSIC_VOLUME_RATIO = 0.5;

// レコードの種類
var RecordType = {
    TURN_START: 0, // 自軍フェイズ開始
    UNIT_ATTACK: 1, // 攻撃
    UNIT_WAND: 2, // 杖
    UNIT_STEAL: 3, // 盗む
    UNIT_FUSIONCATCH: 4, // フュージョン(キャッチ)
    UNIT_FUSIONTRADE: 5, // フュージョン(トレード)
    UNIT_FUSIONRELEASE: 6, // フュージョン(リリース)
    UNIT_FUSIONATTACK: 7, // フュージョン攻撃
    UNIT_METAMORPHOZE: 8, // 形態変化
    UNIT_METAMORCANCEL: 9, // 形態変化解除
    UNIT_OCCUPATION: 10, // 占拠
    UNIT_TREASURE: 11, // 宝箱
    UNIT_VILLAGE: 12, // 村
    UNIT_SHOP: 13, // 店
    UNIT_GATE: 14, // 扉
    UNIT_QUICK: 15, // 行動回復
    UNIT_PLACECOMMAND: 16, // 場所イベント
    UNIT_ITEM: 17, // アイテム
    UNIT_TALK: 18, // 会話
    UNIT_WAIT: 19, // 待機
    PROGRESS_ENEMYPHASE: 20, // 敵軍フェイズ進行中
    PROGRESS_ALLYPHASE: 21 // 同盟軍フェイズ進行中
};

// レコードの種類に対応する文字列
// ユニットの行動を表すものは頭にユニット名がつくことを想定して設定する
var RecordTitleString = {
    0: "ターン目開始", // 自軍フェイズ開始
    1: "が攻撃した", // 攻撃
    2: "が杖を使った", // 杖
    3: "が盗んだ", // 盗む
    4: "が救出した", // フュージョン(キャッチ)
    5: "が引き渡しした", // フュージョン(トレード)
    6: "が降ろした", // フュージョン(リリース)
    7: "が捕獲した", // フュージョン攻撃
    8: "が変身した", // 形態変化
    9: "が変身解除した", // 形態変化解除
    10: "が占拠した", // 占拠
    11: "が宝箱を開けた", // 宝箱
    12: "が訪問した", // 村
    13: "が店に入った", // 店
    14: "が扉を開けた", // 扉
    15: "が踊った", // 行動回復
    17: "がアイテムを使った", // アイテム
    19: "が待機した", // 待機
    20: "敵軍フェイズ進行中", // 敵軍フェイズ進行中
    21: "同盟軍フェイズ進行中" // 同盟軍フェイズ進行中
};

// 場所イベントに対応する文字列
var PlaceCommandRecordTitleString = {
    調べる: "が調べた"
};

// 会話イベントに対応する文字列
var TalkCommandRecordTitleString = {
    会話: "が会話した"
};

// 設定項目はここまで

/*-----------------------------------------------------------------------------------------------------------------
    時戻し処理を管理するオブジェクト
*----------------------------------------------------------------------------------------------------------------*/
var RewindTimeManager = {
    _unitDict: null,
    _weaponList: null,
    _itemList: null,
    _skillList: null,
    _stateList: null,
    _classList: null,
    _fusionList: null,
    _metamorphozeList: null,
    _recordArray: null,
    _latestRecord: null,
    _beforeChangedMapChipDict: null,
    _beforeChangedLayerMapChipDict: null,
    _isIgnoredGlobalSwitchArray: null,
    _isIgnoredLocalSwitchArray: null,
    _curRecordType: 0,
    _placeCommandName: null,
    _talkCommandName: null,
    _curActionUnit: null,
    _isRepeatMoveMode: false,
    _isRewinded: false,
    _isOtherPhazeRewinded: false,
    _srpgStudioScriptVersion: 0,

    // 自動開始イベントでマップ開始時に呼ぶ
    startMap: function () {
        var difficulty = root.getMetaSession().getDifficulty();

        this.initIsIgnoredSwitchArray(true);
        this.initIsIgnoredSwitchArray(false);
        this.setMaxRewindCount(RewindCountLimit[difficulty.getId()]);
        this.initRemainRewindCount();
        Probability.initSeed();
        this.initParam(true);
    },

    // ロード時に呼ぶ
    loadData: function () {
        this.initParam(false);
        this.updateLatestRecord();
    },

    // セーブ時に呼ぶ
    saveData: function () {
        var globalCustom = this.getGlobalCustom();

        globalCustom.recordArrayJSON = JSONParser.stringify(this._recordArray);
        globalCustom.beforeChangedMapChipDictJSON = JSONParser.stringify(this._beforeChangedMapChipDict);
        globalCustom.beforeChangedLayerMapChipDictJSON = JSONParser.stringify(this._beforeChangedLayerMapChipDict);
    },

    initParam: function (isStartMap) {
        var i, count, unit;
        var globalCustom = this.getGlobalCustom();
        var baseData = root.getBaseData();
        var playerList = PlayerList.getMainList();
        var enemyList = EnemyList.getMainList();
        var allyList = AllyList.getMainList();

        this._unitDict = {};
        this._weaponList = baseData.getWeaponList();
        this._itemList = baseData.getItemList();
        this._skillList = baseData.getSkillList();
        this._stateList = baseData.getStateList();
        this._classList = baseData.getClassList();
        this._fusionList = baseData.getFusionList();
        this._metamorphozeList = baseData.getMetamorphozeList();

        count = playerList.getCount();
        for (i = 0; i < count; i++) {
            unit = playerList.getData(i);
            this._unitDict[unit.getId()] = unit;
        }

        count = enemyList.getCount();
        for (i = 0; i < count; i++) {
            unit = enemyList.getData(i);
            this._unitDict[unit.getId()] = unit;
        }

        count = allyList.getCount();
        for (i = 0; i < count; i++) {
            unit = allyList.getData(i);
            this._unitDict[unit.getId()] = unit;
        }

        this.initRecordArray(isStartMap, globalCustom);
        this.initBeforeChangedMapChipDict(isStartMap, false, globalCustom);
        this.initBeforeChangedMapChipDict(isStartMap, true, globalCustom);
        this._latestRecord = {};
        this._isIgnoredGlobalSwitchArray = globalCustom.isIgnoredGlobalSwitchArray;
        this._isIgnoredLocalSwitchArray = globalCustom.isIgnoredLocalSwitchArray;
        this._curRecordType = RecordType.UNIT_WAIT;
        this._placeCommandName = "";
        this._talkCommandName = "";
        this._curActionUnit = null;
        this._isRewinded = false;
        this._srpgStudioScriptVersion = root.getScriptVersion();
    },

    initRecordArray: function (isStartMap, globalCustom) {
        var jsonText;

        if (isStartMap) {
            this._recordArray = [];
            return;
        }

        jsonText = globalCustom.recordArrayJSON;
        this.deleteGlobalCustomProp("recordArrayJSON");

        if (typeof jsonText === "string") {
            this._recordArray = JSONParser.parse(jsonText);
        } else {
            this._recordArray = [];
        }
    },

    initBeforeChangedMapChipDict: function (isStartMap, isLayer, globalCustom) {
        var key;
        var jsonText;

        if (isLayer) {
            this._beforeChangedLayerMapChipDict = {};
            key = "beforeChangedLayerMapChipDictJSON";
        } else {
            this._beforeChangedMapChipDict = {};
            key = "beforeChangedMapChipDictJSON";
        }

        if (isStartMap) {
            return;
        }

        jsonText = globalCustom[key];
        this.deleteGlobalCustomProp(key);

        if (typeof jsonText !== "string") {
            return;
        }

        if (isLayer) {
            this._beforeChangedLayerMapChipDict = JSONParser.parse(jsonText);
        } else {
            this._beforeChangedMapChipDict = JSONParser.parse(jsonText);
        }
    },

    initIsIgnoredSwitchArray: function (isGlobal) {
        var i, count, curSession, mapData, switchTable;
        var globalCustom = this.getGlobalCustom();
        var isIgnoredSwitchArray = [];

        if (isGlobal) {
            switchTable = root.getMetaSession().getGlobalSwitchTable();
        } else {
            curSession = root.getCurrentSession();
            mapData = curSession.getCurrentMapInfo();
            switchTable = mapData.getLocalSwitchTable();
        }

        count = switchTable.getSwitchCount();
        for (i = 0; i < count; i++) {
            isIgnoredSwitchArray.push(false);
        }

        if (isGlobal) {
            globalCustom.isIgnoredGlobalSwitchArray = isIgnoredSwitchArray;
        } else {
            globalCustom.isIgnoredLocalSwitchArray = isIgnoredSwitchArray;
        }
    },

    rewind: function (isSelection, index) {
        var i, key, record;
        var metaSession = root.getMetaSession();
        var curSession = root.getCurrentSession();

        if (isSelection) {
            this.initMapChip(false, curSession);
            this.initMapChip(true, curSession);

            for (i = 0; i <= index; i++) {
                record = this._recordArray[i];

                for (key in record) {
                    switch (key) {
                        case "unitParamArray": // ユニット
                            this.rewindAllUnit(record[key]);
                            break;
                        case "mapChipHandleParamArray": // マップチップ
                            this.rewindMapChip(record[key], false, curSession);
                            break;
                        case "layerMapChipHandleParamArray": // マップチップ(透過レイヤー)
                            this.rewindMapChip(record[key], true, curSession);
                            break;
                        case "mapCursorParam": // マップカーソル
                            this.rewindMapCursor(record[key], curSession);
                            break;
                        case "scrollPixelParam": // スクロール値
                            this.rewindScrollPixel(record[key], curSession);
                            break;
                    }
                }
            }
        } else {
            for (i = 0; i <= index; i++) {
                record = this._recordArray[i];

                for (key in record) {
                    switch (key) {
                        case "gold": // ゴールド
                            this.rewindGold(record[key], metaSession);
                            break;
                        case "bonus": // ボーナス
                            this.rewindBonus(record[key], metaSession);
                            break;
                        case "stockItemParamArray": // ストック
                            this.rewindStock(record[key]);
                            break;
                        case "globalSwitchParamArray": // グローバルスイッチ
                            this.rewindSwitch(record[key], true, metaSession);
                            break;
                        case "variableParamArray": // 変数
                            this.rewindVariable(record[key], metaSession);
                            break;
                        case "placeEventParamArray": // 場所イベント
                            this.rewindEvent(record[key], EventType.PLACE, curSession);
                            break;
                        case "autoEventParamArray": // 自動実行イベント
                            this.rewindEvent(record[key], EventType.AUTO, curSession);
                            break;
                        case "talkEventParamArray": // 会話イベント
                            this.rewindEvent(record[key], EventType.TALK, curSession);
                            break;
                        case "openingEventParamArray": // オープニングイベント
                            this.rewindEvent(record[key], EventType.OPENING, curSession);
                            break;
                        case "endingEventParamArray": // エンディングイベント
                            this.rewindEvent(record[key], EventType.ENDING, curSession);
                            break;
                        case "communicationEventParamArray": // コミュニケーションイベント
                            this.rewindEvent(record[key], EventType.COMMUNICATION, curSession);
                            break;
                        case "mapCommonEventParamArray": // マップ共有イベント
                            this.rewindEvent(record[key], EventType.MAPCOMMON, curSession);
                            break;
                        case "mapBoundaryParam": // 侵入禁止領域の境界値
                            this.rewindMapBoundary(record[key], curSession);
                            break;
                        case "turnCount": // ターン数
                            this.rewindTurnCount(record[key], curSession);
                            break;
                        case "relativeTurnCount": // 相対ターン数
                            this.rewindRelativeTurnCount(record[key], curSession);
                            break;
                        case "turnType": // フェイズ
                            this.rewindTurnType(record[key], curSession);
                            break;
                        case "trophyParamArray": // トロフィー
                            this.rewindTrophy(record[key], curSession);
                            break;
                        case "localSwitchParamArray": // ローカルスイッチ
                            this.rewindSwitch(record[key], false, curSession);
                            break;
                        case "victoryConditionArray": // 勝利条件
                            this.rewindCondition(record[key], true, curSession);
                            break;
                        case "defeatConditionArray": // 敗北条件
                            this.rewindCondition(record[key], false, curSession);
                            break;
                        case "shopDataParamArray": // 店
                            this.rewindShop(record[key], curSession);
                            break;
                        case "placeShopDataParamArray": // 場所イベントの店
                            this.rewindPlaceShop(record[key], curSession);
                            break;
                        case "musicHandleParam": // BGM
                            this.rewindMusic(record[key]);
                            break;
                        case "screenEffectParam": // 画面効果
                            this.rewindScreenEffect(record[key]);
                            break;
                        case "curSeed": // シード値
                            this.rewindCurSeed(record[key]);
                            break;
                        case "custom": // カスパラ
                            this.rewindMapCustom(record[key], curSession);
                            break;
                    }
                }
            }

            this._recordArray = this._recordArray.slice(0, index + 1);
            this.updateLatestRecord();
        }
    },

    // 最新の状態(recordArrayの終端)に巻き戻す
    rewindLatest: function (isSelection) {
        var index = this._recordArray.length - 1;

        this.rewind(isSelection, index);
    },

    rewindAllUnit: function (unitParamArray) {
        var key, i, count, unit, unitParam;
        var unitDict = this._unitDict;

        // 一旦マップ上の全ユニットを消す
        for (key in unitDict) {
            unit = unitDict[key];
            unit.setAliveState(AliveType.ERASE);
        }

        count = unitParamArray.length;
        for (i = 0; i < count; i++) {
            unitParam = unitParamArray[i];
            this.rewindUnit(unitParam);
        }
    },

    rewindUnit: function (unitParam) {
        var key;
        var unit = this._unitDict[unitParam.id];

        for (key in unitParam) {
            switch (key) {
                case "name": // 名前
                    unit.setName(unitParam.name);
                    break;
                case "faceParam": // 顔画像
                    this.rewindFace(unit, unitParam.faceParam);
                    break;
                case "classId": // クラス
                    unit.setClass(this._classList.getDataFromId(unitParam.classId));
                    break;
                case "importance": // 重要度
                    unit.setImportance(unitParam.importance);
                    break;
                case "motionColor": // モーションの色
                    unit.setOriginalMotionColor(unitParam.motionColor);
                    break;
                case "lv": // レベル
                    unit.setLv(unitParam.lv);
                    break;
                case "exp": // 経験値
                    unit.setExp(unitParam.exp);
                    break;
                case "valueArray": // 能力値
                    this.rewindParamValue(unit, unitParam.valueArray);
                    break;
                case "hp": // 現在HP
                    unit.setHp(unitParam.hp);
                    break;
                case "itemArray": // アイテム
                    this.rewindItem(unit, unitParam.itemArray);
                    break;
                case "skillIdArray": // スキル
                    this.rewindSkill(unit, unitParam.skillIdArray);
                    break;
                case "growthBonusArray": // 成長率
                    this.rewindGrowthBonus(unit, unitParam.growthBonusArray);
                    break;
                case "classUpCount": // クラスチェンジ回数
                    unit.setClassUpCount(unitParam.classUpCount);
                    break;
                case "unitStyleParam": // フュージョン
                    this.rewindUnitStyle(unit, unitParam.unitStyleParam);
                    break;
                case "unitType": // 所属
                    this.rewindUnitType(unit, unitParam.unitType);
                    break;
                case "pos": // 座標
                    this.rewindUnitPos(unit, unitParam.pos);
                    break;
                case "slide": // スライド値
                    this.rewindUnitSlide(unit, unitParam.slide);
                    break;
                case "direction": // 方向
                    unit.setDirection(unitParam.direction);
                    break;
                case "aliveState": // 生存状態
                    unit.setAliveState(unitParam.aliveState);
                    break;
                case "sortieState": // 出撃状態
                    unit.setSortieState(unitParam.sortieState);
                    break;
                case "orderMark": // 行動順
                    unit.setOrderMark(unitParam.orderMark);
                    break;
                case "reactionTurnCount": // 再行動許可ターン
                    unit.setReactionTurnCount(unitParam.reactionTurnCount);
                    break;
                case "turnStateArray": // ステート
                    this.rewindTurnStateList(unit, unitParam.turnStateArray);
                    break;
                case "isWait": // 待機状態
                    unit.setWait(unitParam.isWait);
                    break;
                case "isInvisible": // 非表示状態
                    unit.setInvisible(unitParam.isInvisible);
                    break;
                case "isImmortal": // 不死身状態
                    unit.setImmortal(unitParam.isImmortal);
                    break;
                case "isInjury": // 退却可能状態
                    unit.setInjury(unitParam.isInjury);
                    break;
                case "isBadStateGuard": // バステガード状態
                    unit.setBadStateGuard(unitParam.isBadStateGuard);
                    break;
                case "isActionStop": // 行動停止状態
                    unit.setActionStop(unitParam.isActionStop);
                    break;
                case "isSyncope": // キャッチ状態
                    unit.setSyncope(unitParam.isSyncope);
                    break;
                case "custom": // カスパラ
                    this.rewindUnitCustom(unit, unitParam.custom);
                    break;
            }
        }
    },

    rewindFace: function (unit, faceParam) {
        var isRuntime = faceParam.handleType;
        var id = faceParam.resourceId;
        var srcX = faceParam.srcX;
        var srcY = faceParam.srcY;
        var handle = root.createResourceHandle(isRuntime, id, 0, srcX, srcY);

        unit.setFaceResourceHandle(handle);
    },

    rewindParamValue: function (unit, valueArray) {
        var i;

        for (i = 0; i <= 10; i++) {
            unit.setParamValue(i, valueArray[i]);
        }
    },

    rewindItem: function (unit, itemArray) {
        var i, unitItem, item, baseItem;
        var count = DataConfig.getMaxUnitItemCount();

        for (i = 0; i < count; i++) {
            if (i >= itemArray.length) {
                unit.clearItem(i);
                continue;
            }

            unitItem = itemArray[i];

            if (unitItem.isWeapon) {
                baseItem = this._weaponList.getDataFromId(unitItem.itemId);
            } else {
                baseItem = this._itemList.getDataFromId(unitItem.itemId);
            }

            item = root.duplicateItem(baseItem);
            item.setLimit(unitItem.itemLimit);
            unit.setItem(i, item);
        }
    },

    rewindSkill: function (unit, skillIdArray) {
        var i, count, skillId, skill;
        var skillRefList = unit.getSkillReferenceList();
        var editor = root.getDataEditor();

        editor.deleteAllSkillData(skillRefList);

        count = skillIdArray.length;
        for (i = 0; i < count; i++) {
            skillId = skillIdArray[i];
            skill = this._skillList.getDataFromId(skillId);

            editor.addSkillData(skillRefList, skill);
        }
    },

    rewindGrowthBonus: function (unit, growthBonusArray) {
        var i, count;
        var parameter = unit.getGrowthBonus();

        count = growthBonusArray.length;
        for (i = 0; i < count; i++) {
            parameter.setAssistValue(i, growthBonusArray[i]);
        }
    },

    rewindUnitStyle: function (unit, unitStyleParam) {
        var fusion, opponentUnit, metamorphoze;
        var unitStyle = unit.getUnitStyle();

        unitStyle.clearFusionInfo();

        if (unitStyleParam.isFusion) {
            fusion = this._fusionList.getDataFromId(unitStyleParam.fusionId);
            opponentUnit = this._unitDict[unitStyleParam.opponentId];

            if (unitStyleParam.isParent) {
                unitStyle.setFusionChild(opponentUnit);
            } else {
                unitStyle.setFusionParent(opponentUnit);
            }

            unitStyle.setFusionData(fusion);
        }

        unitStyle.clearMetamorphozeData();

        if (unitStyleParam.isMetamorphoze) {
            metamorphoze = this._metamorphozeList.getDataFromId(unitStyleParam.metamorphozeId);
            unit.setClass(this._classList.getDataFromId(unitStyleParam.sourceClassId));
            unitStyle.setMetamorphozeData(metamorphoze);
            unitStyle.setMetamorphozeTurn(unitStyleParam.metamorphozeTurn);
        }
    },

    rewindUnitType: function (unit, unitType) {
        var generator = root.getEventGenerator();
        generator.unitAssign(unit, unitType);
    },

    rewindUnitPos: function (unit, pos) {
        unit.setMapX(pos.x);
        unit.setMapY(pos.y);
    },

    rewindUnitSlide: function (unit, slide) {
        unit.setSlideX(slide.x);
        unit.setSlideY(slide.y);
    },

    rewindTurnStateList: function (unit, turnStateArray) {
        var i, count, turnStateParam, state, turnState;
        var dataEditor = root.getDataEditor();
        var turnStateList = unit.getTurnStateList();
        dataEditor.deleteAllTurnStateData(turnStateList);

        count = turnStateArray.length;
        for (i = 0; i < count; i++) {
            turnStateParam = turnStateArray[i];
            state = this._stateList.getDataFromId(turnStateParam.stateId);
            turnState = dataEditor.addTurnStateData(turnStateList, state);
            turnState.setTurn(turnStateParam.turn);
            turnState.setRemovalCount(turnStateParam.removalCount);
        }
    },

    rewindUnitCustom: function (unit, custom) {
        var key;
        var copiedCustom = JSONParser.deepCopy(custom);

        for (key in unit.custom) {
            delete unit.custom[key];
        }

        for (key in copiedCustom) {
            unit.custom[key] = copiedCustom[key];
        }
    },

    initMapChip: function (isLayer, curSession) {
        var key, handleParam, beforeChangedMapChipDict;
        var mapX, mapY, isRuntime, resourceId, colorIndex, srcX, srcY, handle;

        if (isLayer) {
            beforeChangedMapChipDict = this._beforeChangedLayerMapChipDict;
        } else {
            beforeChangedMapChipDict = this._beforeChangedMapChipDict;
        }

        for (key in beforeChangedMapChipDict) {
            handleParam = beforeChangedMapChipDict[key];

            mapX = handleParam.mx;
            mapY = handleParam.my;
            isRuntime = handleParam.is;
            resourceId = handleParam.id;
            colorIndex = handleParam.c;
            srcX = handleParam.sx;
            srcY = handleParam.sy;
            handle = root.createResourceHandle(isRuntime, resourceId, colorIndex, srcX, srcY);
            curSession.setMapChipGraphicsHandle(mapX, mapY, isLayer, handle);
        }
    },

    rewindMapChip: function (handleParamArray, isLayer, curSession) {
        var i, mapX, mapY, isRuntime, resourceId, colorIndex, srcX, srcY, handle, handleParam;

        for (i = 0; i < handleParamArray.length; i++) {
            handleParam = handleParamArray[i];
            mapX = handleParam.mx;
            mapY = handleParam.my;
            isRuntime = handleParam.is;
            resourceId = handleParam.id;
            colorIndex = handleParam.c;
            srcX = handleParam.sx;
            srcY = handleParam.sy;
            handle = root.createResourceHandle(isRuntime, resourceId, colorIndex, srcX, srcY);
            curSession.setMapChipGraphicsHandle(mapX, mapY, isLayer, handle);
        }
    },

    rewindMapCursor: function (mapCursorParam, curSession) {
        curSession.setMapCursorX(mapCursorParam.x);
        curSession.setMapCursorY(mapCursorParam.y);
    },

    rewindScrollPixel: function (scrollPixelParam, curSession) {
        curSession.setScrollPixelX(scrollPixelParam.x);
        curSession.setScrollPixelY(scrollPixelParam.y);
    },

    rewindGold: function (gold, metaSession) {
        metaSession.setGold(gold);
    },

    rewindBonus: function (bonus, metaSession) {
        metaSession.setBonus(bonus);
    },

    rewindStock: function (stockItemParamArray) {
        var i, itemParam, baseItem, item;
        var stockItemArray = StockItemControl.getStockItemArray();
        var count = stockItemParamArray.length;

        stockItemArray.splice(0, stockItemArray.length);

        for (i = 0; i < count; i++) {
            itemParam = stockItemParamArray[i];

            if (itemParam.isWeapon) {
                baseItem = this._weaponList.getData(itemParam.itemId);
            } else {
                baseItem = this._itemList.getData(itemParam.itemId);
            }

            item = root.duplicateItem(baseItem);
            item.setLimit(itemParam.itemLimit);

            stockItemArray.push(item);
        }
    },

    rewindSwitch: function (switchParamArray, isGlobal, session) {
        var i, count, index, switchTable, switchParam, switchParamArray, isIgnoredSwitchArray;

        if (isGlobal) {
            switchTable = session.getGlobalSwitchTable();
            isIgnoredSwitchArray = this._isIgnoredGlobalSwitchArray;
        } else {
            switchTable = session.getCurrentMapInfo().getLocalSwitchTable();
            isIgnoredSwitchArray = this._isIgnoredLocalSwitchArray;
        }

        count = switchParamArray.length;
        for (i = 0; i < count; i++) {
            switchParam = switchParamArray[i];
            index = switchTable.getSwitchIndexFromId(switchParam.id);

            if (isIgnoredSwitchArray[index]) {
                continue;
            }

            switchTable.setSwitch(index, switchParam.isSwitchOn);
        }
    },

    rewindVariable: function (variableParamArray, metaSession) {
        var i, count, index, variableParam, variableTable;

        count = variableParamArray.length;
        for (i = 0; i < count; i++) {
            variableParam = variableParamArray[i];
            variableTable = metaSession.getVariableTable(variableParam.col);
            index = variableTable.getVariableIndexFromId(variableParam.id);
            variableTable.setVariable(index, variableParam.value);
        }
    },

    rewindEvent: function (eventParamArray, eventType, curSession) {
        var i, count, event, eventList;

        switch (eventType) {
            case EventType.PLACE:
                eventList = curSession.getPlaceEventList();
                break;
            case EventType.AUTO:
                eventList = curSession.getAutoEventList();
                break;
            case EventType.TALK:
                eventList = curSession.getTalkEventList();
                break;
            case EventType.OPENING:
                eventList = curSession.getOpeningEventList();
                break;
            case EventType.ENDING:
                eventList = curSession.getEndingEventList();
                break;
            case EventType.COMMUNICATION:
                eventList = curSession.getCommunicationEventList();
                break;
            case EventType.MAPCOMMON:
                eventList = curSession.getMapCommonEventList();
                break;
        }

        count = eventParamArray.length;
        for (i = 0; i < count; i++) {
            eventParam = eventParamArray[i];
            event = eventList.getData(eventParam.index);
            event.setExecutedMark(eventParam.executedMark);
        }
    },

    rewindMapBoundary: function (mapBoundaryParam, curSession) {
        curSession.setMapBoundaryValue(mapBoundaryParam.value);

        if (this._srpgStudioScriptVersion >= 1287) {
            curSession.setMapBoundaryValueEx(mapBoundaryParam.valueX, mapBoundaryParam.valueY);
        }
    },

    rewindTurnCount: function (turnCount, curSession) {
        curSession.setTurnCount(turnCount);
    },

    rewindRelativeTurnCount: function (relativeTurnCount, curSession) {
        curSession.setRelativeTurnCount(relativeTurnCount);
    },

    rewindTurnType: function (turnType, curSession) {
        curSession.setTurnType(turnType);
    },

    rewindTrophy: function (trophyParamArray, curSession) {
        var i, count, trophyParam, trophyFlag, baseItem, item;
        var editor = curSession.getTrophyEditor();
        var trophyPoolList = curSession.getTrophyPoolList();

        editor.deleteAllTrophy(trophyPoolList);

        count = trophyParamArray.length;
        for (i = 0; i < count; i++) {
            trophyParam = trophyParamArray[i];
            trophyFlag = trophyParam.flag;

            switch (trophyFlag) {
                case TrophyFlag.ITEM:
                    if (trophyParam.isWeapon) {
                        baseItem = this._weaponList.getData(trophyParam.itemId);
                    } else {
                        baseItem = this._itemList.getData(trophyParam.itemId);
                    }

                    item = root.duplicateItem(baseItem);
                    item.setLimit(trophyParam.itemLimit);

                    editor.addItem(trophyPoolList, item, false);
                    break;
                case TrophyFlag.GOLD:
                    editor.addGold(trophyPoolList, trophyParam.gold, false);
                    break;
                case TrophyFlag.BONUS:
                    editor.addBonus(trophyPoolList, trophyParam.bonus, false);
                    break;
            }
        }
    },

    rewindCondition: function (conditionArray, isVictory, curSession) {
        var i;
        var mapData = curSession.getCurrentMapInfo();

        for (i = 0; i < 3; i++) {
            if (isVictory) {
                mapData.setVictoryCondition(i, conditionArray[i]);
            } else {
                mapData.setDefeatCondition(i, conditionArray[i]);
            }
        }
    },

    rewindShop: function (shopDataParamArray, curSession) {
        var i, count, index, shopData, shopDataParam, shopItemArray, inventoryNumberArray;
        var j, item, baseItem, itemParam, inventory, itemParamArray;
        var mapData = curSession.getCurrentMapInfo();
        var shopDataList = mapData.getShopDataList();

        count = shopDataParamArray.length;
        for (i = 0; i < count; i++) {
            shopDataParam = shopDataParamArray[i];
            index = shopDataParam.index;
            itemParamArray = shopDataParam.itemParamArray;
            shopData = shopDataList.getData(index);
            shopItemArray = shopData.getShopItemArray();
            inventoryNumberArray = shopData.getInventoryNumberArray();

            shopItemArray.splice(0, shopItemArray.length);

            for (j = 0; j < itemParamArray.length; j++) {
                itemParam = itemParamArray[j];
                inventory = inventoryNumberArray[j];

                if (itemParam.isWeapon) {
                    baseItem = this._weaponList.getData(itemParam.itemId);
                } else {
                    baseItem = this._itemList.getData(itemParam.itemId);
                }

                item = root.duplicateItem(baseItem);
                item.setLimit(itemParam.itemLimit);

                shopItemArray.push(item);
                inventory.setAmount(itemParam.amount);
            }
        }
    },

    rewindPlaceShop: function (placeShopDataParamArray, curSession) {
        var i, count, event, shopData, shopDataParam, shopItemArray, inventoryNumberArray;
        var j, item, baseItem, itemParam, inventory, itemParamArray;
        var eventList = curSession.getPlaceEventList();

        count = placeShopDataParamArray.length;
        for (i = 0; i < count; i++) {
            shopDataParam = placeShopDataParamArray[i];
            itemParamArray = shopDataParam.itemParamArray;
            event = eventList.getData(shopDataParam.index);
            shopData = event.getPlaceEventInfo().getShopData();
            shopItemArray = shopData.getShopItemArray();
            inventoryNumberArray = shopData.getInventoryNumberArray();

            shopItemArray.splice(0, shopItemArray.length);

            for (j = 0; j < itemParamArray.length; j++) {
                itemParam = itemParamArray[j];
                inventory = inventoryNumberArray[j];

                if (itemParam.isWeapon) {
                    baseItem = this._weaponList.getData(itemParam.itemId);
                } else {
                    baseItem = this._itemList.getData(itemParam.itemId);
                }

                item = root.duplicateItem(baseItem);
                item.setLimit(itemParam.itemLimit);

                shopItemArray.push(item);
                inventory.setAmount(itemParam.amount);
            }
        }
    },

    rewindMusic: function (musicHandleParam) {
        var isRuntime = musicHandleParam.isRuntime;
        var resourceId = musicHandleParam.resourceId;
        var curMusicHandle = root.getMediaManager().getActiveMusicHandle();
        var prevMusicHandle = root.createResourceHandle(isRuntime, resourceId, 0, 0, 0);

        if (prevMusicHandle.isEqualHandle(curMusicHandle)) {
            MediaControl.musicPlay(prevMusicHandle);
        } else {
            MediaControl.musicPlayNew(prevMusicHandle);
        }
    },

    rewindScreenEffect: function (screenEffectParam) {
        var screenEffect = root.getScreenEffect();

        screenEffect.setColor(screenEffectParam.color);
        screenEffect.setAlpha(screenEffectParam.alpha);
        screenEffect.setRange(screenEffectParam.range);
    },

    rewindCurSeed: function (curSeed) {
        Probability.setCurSeed(curSeed);
    },

    rewindMapCustom: function (custom, curSession) {
        var key;
        var copiedCustom = JSONParser.deepCopy(custom);
        var mapData = curSession.getCurrentMapInfo();

        for (key in mapData.custom) {
            delete mapData.custom[key];
        }

        for (key in copiedCustom) {
            mapData.custom[key] = copiedCustom[key];
        }
    },

    appendRecord: function (recordType) {
        var unit = this._curActionUnit;
        var record = {};
        var newLatestRecord = {};

        if (root.getBaseScene() !== SceneType.FREE) {
            return;
        }

        record.recordType = recordType;

        if (recordType !== RecordType.TURN_START && unit !== null) {
            record.unitName = unit.getName();
        } else {
            record.unitName = "";
        }

        this.createRecord(record, newLatestRecord);
        this._recordArray.push(record);
        this._latestRecord = newLatestRecord;
        this.setCurRecordType(RecordType.UNIT_WAIT);
        this.setCurActionUnit(null);
    },

    updateLatestRecord: function () {
        var record = {};
        var newLatestRecord = {};

        if (root.getBaseScene() !== SceneType.FREE) {
            return;
        }

        this.createRecord(record, newLatestRecord);
        this._latestRecord = newLatestRecord;
    },

    createRecord: function (record, newLatestRecord) {
        var isFirstRecord = this._recordArray.length === 0 ? true : false;
        var latestRecord = this._latestRecord;
        var metaSession = root.getMetaSession();
        var curSession = root.getCurrentSession();

        this.createUnitRecord(record, newLatestRecord, latestRecord, isFirstRecord);
        this.createGoldRecord(record, newLatestRecord, latestRecord.gold, isFirstRecord, metaSession);
        this.createBonusRecord(record, newLatestRecord, latestRecord.bonus, isFirstRecord, metaSession);
        this.createStockItemRecord(record, newLatestRecord, latestRecord.stockItemParamArray, isFirstRecord);
        this.createSwitchRecord(record, newLatestRecord, latestRecord.globalSwitchParamArray, isFirstRecord, true, metaSession);
        this.createVariableRecord(record, newLatestRecord, latestRecord.variableParamArrays, isFirstRecord, metaSession);
        this.createEventRecord(record, newLatestRecord, latestRecord.placeEventParamArray, isFirstRecord, EventType.PLACE, curSession);
        this.createEventRecord(record, newLatestRecord, latestRecord.autoEventParamArray, isFirstRecord, EventType.AUTO, curSession);
        this.createEventRecord(record, newLatestRecord, latestRecord.talkEventParamArray, isFirstRecord, EventType.TALK, curSession);
        this.createEventRecord(record, newLatestRecord, latestRecord.openingEventParamArray, isFirstRecord, EventType.OPENING, curSession);
        this.createEventRecord(record, newLatestRecord, latestRecord.endingEventParamArray, isFirstRecord, EventType.ENDING, curSession);
        this.createEventRecord(record, newLatestRecord, latestRecord.commuEventParamArray, isFirstRecord, EventType.COMMUNICATION, curSession);
        this.createEventRecord(record, newLatestRecord, latestRecord.mapCommonEventParamArray, isFirstRecord, EventType.MAPCOMMON, curSession);
        this.createPlaceShopRecord(record, newLatestRecord, latestRecord.placeShopDataParamDict, isFirstRecord, curSession);
        this.createMapBoundaryRecord(record, newLatestRecord, latestRecord.mapBoundaryParam, isFirstRecord, curSession);
        this.createMapCursorRecord(record, newLatestRecord, latestRecord.mapCursorParam, isFirstRecord, curSession);
        this.createScrollPixelRecord(record, newLatestRecord, latestRecord.scrollPixelParam, isFirstRecord, curSession);
        this.createTurnCountRecord(record, newLatestRecord, latestRecord.turnCount, isFirstRecord, curSession);
        this.createRelativeTurnCountRecord(record, newLatestRecord, latestRecord.relativeTurnCount, isFirstRecord, curSession);
        this.createTurnTypeRecord(record, newLatestRecord, latestRecord.turnType, isFirstRecord, curSession);
        this.createTrophyRecord(record, newLatestRecord, latestRecord.trophyParamArray, isFirstRecord, curSession);
        this.createMapChipRecord(record, newLatestRecord, latestRecord.mapChipHandleParamArray, isFirstRecord, false, curSession);
        this.createMapChipRecord(record, newLatestRecord, latestRecord.layerMapChipHandleParamArray, isFirstRecord, true, curSession);
        this.createMusicRecord(record, newLatestRecord, latestRecord.musicHandleParam, isFirstRecord);
        this.createScreenEffectRecord(record, newLatestRecord, latestRecord.screenEffectParam, isFirstRecord);
        this.createSwitchRecord(record, newLatestRecord, latestRecord.localSwitchParamArray, isFirstRecord, false, curSession);
        this.createConditionRecord(record, newLatestRecord, latestRecord.victoryConditionArray, isFirstRecord, true, curSession);
        this.createConditionRecord(record, newLatestRecord, latestRecord.defeatConditionArray, isFirstRecord, false, curSession);
        this.createShopRecord(record, newLatestRecord, latestRecord.shopDataParamArray, isFirstRecord, curSession);
        this.createCurSeedRecord(record, newLatestRecord, latestRecord.curSeed, isFirstRecord);

        if (IS_ALLOWED_REWIND_MAP_CUSTOM) {
            this.createMapCustomRecord(record, newLatestRecord, latestRecord.custom, isFirstRecord, curSession);
        }
    },

    createUnitRecord: function (record, newLatestRecord, latestRecord, isFirstRecord) {
        var key, unit, unitParam, newLatestUnitParam, latestUnitParam;
        var unitParamArray = [];
        var newLatestUnitParamDict = {};
        var latestUnitParamDict = this._latestRecord.unitParamDict;
        var unitDict = this._unitDict;

        for (key in unitDict) {
            unit = unitDict[key];
            unitParam = {};
            newLatestUnitParam = {};
            latestUnitParam = {};

            if (latestUnitParamDict !== undefined) {
                latestUnitParam = latestUnitParamDict[key];

                if (latestUnitParam === undefined) {
                    latestUnitParam = {};
                }
            }

            this.createUnitParam(unit, unitParam, newLatestUnitParam, latestUnitParam, isFirstRecord);

            unitParamArray.push(unitParam);
            newLatestUnitParamDict[key] = newLatestUnitParam;
        }

        record.unitParamArray = unitParamArray;
        newLatestRecord.unitParamDict = newLatestUnitParamDict;
    },

    createUnitParam: function (unit, unitParam, newLatestUnitParam, latestUnitParam, isFirstRecord) {
        this.createUnitIdRecord(unit, unitParam, newLatestUnitParam);
        this.createUnitNameRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.name, isFirstRecord);
        this.createUnitFaceRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.faceParam, isFirstRecord);
        this.createUnitClassRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.classId, isFirstRecord);
        this.createUnitImportanceRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.importance, isFirstRecord);
        this.createUnitMotionColorRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.motionColor, isFirstRecord);
        this.createUnitLvRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.lv, isFirstRecord);
        this.createUnitExpRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.exp, isFirstRecord);
        this.createUnitValueRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.valueArray, isFirstRecord);
        this.createUnitHpRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.hp, isFirstRecord);
        this.createUnitItemRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.itemArray, isFirstRecord);
        this.createUnitSkillRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.skillIdArray, isFirstRecord);
        this.createUnitGrowthBonusRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.growthBonusArray, isFirstRecord);
        this.createUnitClassUpCountRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.classUpCount, isFirstRecord);
        this.createUnitStyleRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.unitStyleParam, isFirstRecord);
        this.createUnitTypeRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.unitType, isFirstRecord);
        this.createUnitPosRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.pos, isFirstRecord);
        this.createUnitSlideRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.slide, isFirstRecord);
        this.createUnitDiretionRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.direction, isFirstRecord);
        this.createUnitAliveStateRecord(unit, unitParam, newLatestUnitParam, latestUnitParam);
        this.createUnitSortieStateRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.sortieState, isFirstRecord);
        this.createUnitOrderMarkRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.orderMark, isFirstRecord);
        this.createUnitReactionTurnCountRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.reactionTurnCount, isFirstRecord);
        this.createUnitTurnStateRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.turnStateArray, isFirstRecord);
        this.createUnitIsWaitRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.isWait, isFirstRecord);
        this.createUnitIsInvisibleRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.isInvisible, isFirstRecord);
        this.createUnitIsImmortalRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.isImmortal, isFirstRecord);
        this.createUnitIsInjuryRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.isInjury, isFirstRecord);
        this.createUnitIsBadStateGuardRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.isBadStateGuard, isFirstRecord);
        this.createUnitIsActionStopRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.isActionStop, isFirstRecord);
        this.createUnitIsSyncopeRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.isSyncope, isFirstRecord);

        if (IS_ALLOWED_REWIND_UNIT_CUSTOM) {
            this.createUnitCustomRecord(unit, unitParam, newLatestUnitParam, latestUnitParam.custom, isFirstRecord);
        }
    },

    createUnitIdRecord: function (unit, unitParam, newLatestUnitParam) {
        unitParam.id = unit.getId();
        newLatestUnitParam.id = unitParam.id;
    },

    createUnitNameRecord: function (unit, unitParam, newLatestUnitParam, latestName, isFirstRecord) {
        var name = unit.getName();

        if (this._srpgStudioScriptVersion < 1061) {
            return;
        }

        if (isFirstRecord || name !== latestName) {
            unitParam.name = name;
        }

        newLatestUnitParam.name = name;
    },

    createUnitFaceRecord: function (unit, unitParam, newLatestUnitParam, latestFaceParam, isFirstRecord) {
        var faceParam = {};
        var newLatestFaceParam = {};
        var handle = unit.getFaceResourceHandle();

        faceParam.handleType = handle.getHandleType();
        faceParam.resourceId = handle.getResourceId();
        faceParam.srcX = handle.getSrcX();
        faceParam.srcY = handle.getSrcY();
        newLatestFaceParam.handleType = faceParam.handleType;
        newLatestFaceParam.resourceId = faceParam.resourceId;
        newLatestFaceParam.srcX = faceParam.srcX;
        newLatestFaceParam.srcY = faceParam.srcY;

        if (isFirstRecord || this.hasDiffProperties(faceParam, latestFaceParam)) {
            unitParam.faceParam = faceParam;
        }

        newLatestUnitParam.faceParam = newLatestFaceParam;
    },

    createUnitClassRecord: function (unit, unitParam, newLatestUnitParam, latestClassId, isFirstRecord) {
        var classId = unit.getClass().getId();

        if (isFirstRecord || classId !== latestClassId) {
            unitParam.classId = classId;
        }

        newLatestUnitParam.classId = classId;
    },

    createUnitImportanceRecord: function (unit, unitParam, newLatestUnitParam, latestImportance, isFirstRecord) {
        var importance = unit.getImportance();

        if (isFirstRecord || importance !== latestImportance) {
            unitParam.importance = importance;
        }

        newLatestUnitParam.importance = importance;
    },

    createUnitMotionColorRecord: function (unit, unitParam, newLatestUnitParam, latestMotionColor, isFirstRecord) {
        var motionColor = unit.getOriginalMotionColor();

        if (isFirstRecord || motionColor !== latestMotionColor) {
            unitParam.motionColor = motionColor;
        }

        newLatestUnitParam.motionColor = motionColor;
    },

    createUnitLvRecord: function (unit, unitParam, newLatestUnitParam, latestLv, isFirstRecord) {
        var lv = unit.getLv();

        if (isFirstRecord || lv !== latestLv) {
            unitParam.lv = lv;
        }

        newLatestUnitParam.lv = lv;
    },

    createUnitExpRecord: function (unit, unitParam, newLatestUnitParam, latestExp, isFirstRecord) {
        var exp = unit.getExp();

        if (isFirstRecord || exp !== latestExp) {
            unitParam.exp = exp;
        }

        newLatestUnitParam.exp = exp;
    },

    createUnitValueRecord: function (unit, unitParam, newLatestUnitParam, latestValueArray, isFirstRecord) {
        var value;
        var valueArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        var newLatestValueArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        for (i = 0; i <= 10; i++) {
            value = unit.getParamValue(i);
            valueArray[i] = value;
            newLatestValueArray[i] = value;
        }

        if (isFirstRecord || this.hasDiffProperties(valueArray, latestValueArray)) {
            unitParam.valueArray = valueArray;
        }

        newLatestUnitParam.valueArray = newLatestValueArray;
    },

    createUnitHpRecord: function (unit, unitParam, newLatestUnitParam, latestHp, isFirstRecord) {
        var hp = unit.getHp();

        if (isFirstRecord || hp !== latestHp) {
            unitParam.hp = hp;
        }

        newLatestUnitParam.hp = hp;
    },

    createUnitItemRecord: function (unit, unitParam, newLatestUnitParam, latestItemArray, isFirstRecord) {
        var item, itemParam, newLatestItemParam;
        var itemArray = [];
        var newLatestItemArray = [];
        var count = DataConfig.getMaxUnitItemCount();

        for (i = 0; i < count; i++) {
            item = unit.getItem(i);

            if (item == null) {
                break;
            }

            itemParam = {};
            itemParam.isWeapon = item.isWeapon();
            itemParam.itemId = item.getId();
            itemParam.itemLimit = item.getLimit();
            newLatestItemParam = {};
            newLatestItemParam.isWeapon = itemParam.isWeapon;
            newLatestItemParam.itemId = itemParam.itemId;
            newLatestItemParam.itemLimit = itemParam.itemLimit;

            itemArray.push(itemParam);
            newLatestItemArray.push(newLatestItemParam);
        }

        if (isFirstRecord || this.hasDiffProperties(itemArray, latestItemArray)) {
            unitParam.itemArray = itemArray;
        }

        newLatestUnitParam.itemArray = newLatestItemArray;
    },

    createUnitSkillRecord: function (unit, unitParam, newLatestUnitParam, latestSkillIdArray, isFirstRecord) {
        var i, count, skill, skillId;
        var skillIdArray = [];
        var newLatestSkillIdArray = [];
        var skillRefList = unit.getSkillReferenceList();
        var count = skillRefList.getTypeCount();

        for (i = 0; i < count; i++) {
            skill = skillRefList.getTypeData(i);
            skillId = skill.getId();

            skillIdArray.push(skillId);
            newLatestSkillIdArray.push(skillId);
        }

        if (isFirstRecord || this.hasDiffProperties(skillIdArray, latestSkillIdArray)) {
            unitParam.skillIdArray = skillIdArray;
        }

        newLatestUnitParam.skillIdArray = newLatestSkillIdArray;
    },

    createUnitGrowthBonusRecord: function (unit, unitParam, newLatestUnitParam, latestGrowthBonusArray, isFirstRecord) {
        var growthBonusArray = [];
        var newLatestGrowthBonusArray = [];
        var parameter = unit.getGrowthBonus();

        for (i = 0; i < 11; i++) {
            growthBonusArray.push(parameter.getAssistValue(i));
            newLatestGrowthBonusArray.push(growthBonusArray[i]);
        }

        if (isFirstRecord || this.hasDiffProperties(growthBonusArray, latestGrowthBonusArray)) {
            unitParam.growthBonusArray = growthBonusArray;
        }

        newLatestUnitParam.growthBonusArray = newLatestGrowthBonusArray;
    },

    createUnitClassUpCountRecord: function (unit, unitParam, newLatestUnitParam, latestClassUpCount, isFirstRecord) {
        var classUpCount = unit.getClassUpCount();

        if (isFirstRecord || classUpCount !== latestClassUpCount) {
            unitParam.classUpCount = classUpCount;
        }

        newLatestUnitParam.classUpCount = classUpCount;
    },

    createUnitStyleRecord: function (unit, unitParam, newLatestUnitParam, latestUnitStyleParam, isFirstRecord) {
        var unitStyleParam = {
            isFusion: false,
            fusionId: 0,
            isParent: false,
            opponentId: 0,
            isMetamorphoze: false,
            metamorphozeId: 0,
            metamorphozeTurn: 0,
            sourceClassId: 0
        };
        var newLatestUnitStyleParam = {};
        var unitStyle = unit.getUnitStyle();

        if (unitStyle.getFusionData() !== null) {
            unitStyleParam.isFusion = true;
            unitStyleParam.fusionId = unitStyle.getFusionData().getId();

            if (unitStyle.getFusionParent() === null) {
                unitStyleParam.isParent = true;
                unitStyleParam.opponentId = unitStyle.getFusionChild().getId();
            } else {
                unitStyleParam.isParent = false;
                unitStyleParam.opponentId = unitStyle.getFusionParent().getId();
            }
        }

        if (unitStyle.getMetamorphozeData() !== null) {
            unitStyleParam.isMetamorphoze = true;
            unitStyleParam.metamorphozeId = unitStyle.getMetamorphozeData().getId();
            unitStyleParam.metamorphozeTurn = unitStyle.getMetamorphozeTurn();
            unitStyleParam.sourceClassId = unitStyle.getSourceClass().getId();
        }

        newLatestUnitStyleParam.isFusion = unitStyleParam.isFusion;
        newLatestUnitStyleParam.fusionId = unitStyleParam.fusionId;
        newLatestUnitStyleParam.isParent = unitStyleParam.isParent;
        newLatestUnitStyleParam.opponentId = unitStyleParam.opponentId;
        newLatestUnitStyleParam.isMetamorphoze = unitStyleParam.isMetamorphoze;
        newLatestUnitStyleParam.metamorphozeId = unitStyleParam.metamorphozeId;
        newLatestUnitStyleParam.metamorphozeTurn = unitStyleParam.metamorphozeTurn;
        newLatestUnitStyleParam.sourceClassId = unitStyleParam.sourceClassId;

        if (isFirstRecord || this.hasDiffProperties(unitStyleParam, latestUnitStyleParam)) {
            unitParam.unitStyleParam = unitStyleParam;
        }

        newLatestUnitParam.unitStyleParam = newLatestUnitStyleParam;
    },

    createUnitTypeRecord: function (unit, unitParam, newLatestUnitParam, latestUnitType, isFirstRecord) {
        var unitType = unit.getUnitType();

        if (isFirstRecord || unitType !== latestUnitType) {
            unitParam.unitType = unitType;
        }

        newLatestUnitParam.unitType = unitType;
    },

    createUnitPosRecord: function (unit, unitParam, newLatestUnitParam, latestPos, isFirstRecord) {
        var pos = {};
        var newLatestPos = {};

        pos.x = unit.getMapX();
        pos.y = unit.getMapY();
        newLatestPos.x = pos.x;
        newLatestPos.y = pos.y;

        if (isFirstRecord || this.hasDiffProperties(pos, latestPos)) {
            unitParam.pos = pos;
        }

        newLatestUnitParam.pos = newLatestPos;
    },

    createUnitSlideRecord: function (unit, unitParam, newLatestUnitParam, latestSlide, isFirstRecord) {
        var slide = {};
        var newLatestSlide = {};

        slide.x = unit.getSlideX();
        slide.y = unit.getSlideY();
        newLatestSlide.x = slide.x;
        newLatestSlide.y = slide.y;

        if (isFirstRecord || this.hasDiffProperties(slide, latestSlide)) {
            unitParam.slide = slide;
        }

        newLatestUnitParam.slide = newLatestSlide;
    },

    createUnitDiretionRecord: function (unit, unitParam, newLatestUnitParam, latestDirection, isFirstRecord) {
        var direction = unit.getDirection();

        if (isFirstRecord || direction !== latestDirection) {
            unitParam.direction = direction;
        }

        newLatestUnitParam.direction = direction;
    },

    createUnitAliveStateRecord: function (unit, unitParam, newLatestUnitParam) {
        unitParam.aliveState = unit.getAliveState();
        newLatestUnitParam.aliveState = unitParam.aliveState;
    },

    createUnitSortieStateRecord: function (unit, unitParam, newLatestUnitParam, latestSortieState, isFirstRecord) {
        var sortieState = unit.getSortieState();

        if (isFirstRecord || sortieState !== latestSortieState) {
            unitParam.sortieState = sortieState;
        }

        newLatestUnitParam.sortieState = sortieState;
    },

    createUnitOrderMarkRecord: function (unit, unitParam, newLatestUnitParam, latestOrderMark, isFirstRecord) {
        var orderMark = unit.getOrderMark();

        if (isFirstRecord || orderMark !== latestOrderMark) {
            unitParam.orderMark = orderMark;
        }

        newLatestUnitParam.orderMark = orderMark;
    },

    createUnitReactionTurnCountRecord: function (unit, unitParam, newLatestUnitParam, latestReactionTurnCount, isFirstRecord) {
        var reactionTurnCount = unit.getReactionTurnCount();

        if (isFirstRecord || reactionTurnCount !== latestReactionTurnCount) {
            unitParam.reactionTurnCount = reactionTurnCount;
        }

        newLatestUnitParam.reactionTurnCount = reactionTurnCount;
    },

    createUnitTurnStateRecord: function (unit, unitParam, newLatestUnitParam, latestTurnStateArray, isFirstRecord) {
        var i, turnState, turnStateParam, newLatestTurnStateParam;
        var turnStateArray = [];
        var newLatestTurnStateArray = [];
        var turnStateList = unit.getTurnStateList();
        var count = turnStateList.getCount();

        for (i = 0; i < count; i++) {
            turnState = turnStateList.getData(i);
            turnStateParam = {};
            turnStateParam.stateId = turnState.getState().getId();
            turnStateParam.turn = turnState.getTurn();
            turnStateParam.removalCount = turnState.getRemovalCount();
            newLatestTurnStateParam = {};
            newLatestTurnStateParam.stateId = turnStateParam.stateId;
            newLatestTurnStateParam.turn = turnStateParam.turn;
            newLatestTurnStateParam.removalCount = turnStateParam.removalCount;

            turnStateArray.push(turnStateParam);
            newLatestTurnStateArray.push(newLatestTurnStateParam);
        }

        if (isFirstRecord || this.hasDiffProperties(turnStateArray, latestTurnStateArray)) {
            unitParam.turnStateArray = turnStateArray;
        }

        newLatestUnitParam.turnStateArray = newLatestTurnStateArray;
    },

    createUnitIsWaitRecord: function (unit, unitParam, newLatestUnitParam, latestIsWait, isFirstRecord) {
        var isWait = unit.isWait();

        if (isFirstRecord || isWait !== latestIsWait) {
            unitParam.isWait = isWait;
        }

        newLatestUnitParam.isWait = isWait;
    },

    createUnitIsInvisibleRecord: function (unit, unitParam, newLatestUnitParam, latestIsInvisible, isFirstRecord) {
        var isInvisible = unit.isInvisible();

        if (isFirstRecord || isInvisible !== latestIsInvisible) {
            unitParam.isInvisible = isInvisible;
        }

        newLatestUnitParam.isInvisible = isInvisible;
    },

    createUnitIsImmortalRecord: function (unit, unitParam, newLatestUnitParam, latestIsImmortal, isFirstRecord) {
        var isImmortal = unit.isImmortal();

        if (isFirstRecord || isImmortal !== latestIsImmortal) {
            unitParam.isImmortal = isImmortal;
        }

        newLatestUnitParam.isImmortal = isImmortal;
    },

    createUnitIsInjuryRecord: function (unit, unitParam, newLatestUnitParam, latestIsInjury, isFirstRecord) {
        var isInjury = unit.isInjury();

        if (isFirstRecord || isInjury !== latestIsInjury) {
            unitParam.isInjury = isInjury;
        }

        newLatestUnitParam.isInjury = isInjury;
    },

    createUnitIsBadStateGuardRecord: function (unit, unitParam, newLatestUnitParam, latestIsBadStateGuard, isFirstRecord) {
        var isBadStateGuard = unit.isBadStateGuard();

        if (isFirstRecord || isBadStateGuard !== latestIsBadStateGuard) {
            unitParam.isBadStateGuard = isBadStateGuard;
        }

        newLatestUnitParam.isBadStateGuard = isBadStateGuard;
    },

    createUnitIsActionStopRecord: function (unit, unitParam, newLatestUnitParam, latestIsActionStop, isFirstRecord) {
        var isActionStop = unit.isActionStop();

        if (isFirstRecord || isActionStop !== latestIsActionStop) {
            unitParam.isActionStop = isActionStop;
        }

        newLatestUnitParam.isActionStop = isActionStop;
    },

    createUnitIsSyncopeRecord: function (unit, unitParam, newLatestUnitParam, latestIsSyncope, isFirstRecord) {
        var isSyncope = unit.isSyncope();

        if (isFirstRecord || isSyncope !== latestIsSyncope) {
            unitParam.isSyncope = isSyncope;
        }

        newLatestUnitParam.isSyncope = isSyncope;
    },

    createUnitCustomRecord: function (unit, unitParam, newLatestUnitParam, latestCustom, isFirstRecord) {
        var custom = unit.custom;
        var customText = JSONParser.stringify(custom);

        if (isFirstRecord || this.hasDiffProperties(custom, latestCustom)) {
            unitParam.custom = JSONParser.parse(customText);
        }

        newLatestUnitParam.custom = JSONParser.parse(customText);
    },

    createGoldRecord: function (record, newLatestRecord, latestGold, isFirstRecord, metaSession) {
        var gold = metaSession.getGold();

        if (isFirstRecord || gold !== latestGold) {
            record.gold = gold;
        }

        newLatestRecord.gold = gold;
    },

    createBonusRecord: function (record, newLatestRecord, latestBonus, isFirstRecord, metaSession) {
        var bonus = metaSession.getBonus();

        if (isFirstRecord || bonus !== latestBonus) {
            record.bonus = bonus;
        }

        newLatestRecord.bonus = bonus;
    },

    createStockItemRecord: function (record, newLatestRecord, latestStockItemParamArray, isFirstRecord) {
        var i, count, item, itemParam, newLatestItemParam;
        var stockItemArray = StockItemControl.getStockItemArray();
        var stockItemParamArray = [];
        var newLatestStockItemParamArray = [];

        count = stockItemArray.length;
        for (i = 0; i < count; i++) {
            item = stockItemArray[i];
            itemParam = {};
            newLatestItemParam = {};

            itemParam.isWeapon = item.isWeapon();
            itemParam.itemId = item.getId();
            itemParam.itemLimit = item.getLimit();
            newLatestItemParam.isWeapon = itemParam.isWeapon;
            newLatestItemParam.itemId = itemParam.itemId;
            newLatestItemParam.itemLimit = itemParam.itemLimit;

            stockItemParamArray.push(itemParam);
            newLatestStockItemParamArray.push(newLatestItemParam);
        }

        if (isFirstRecord || this.hasDiffProperties(stockItemParamArray, latestStockItemParamArray)) {
            record.stockItemParamArray = stockItemParamArray;
        }

        newLatestRecord.stockItemParamArray = newLatestStockItemParamArray;
    },

    createSwitchRecord: function (record, newLatestRecord, latestSwitchParamArray, isFirstRecord, isGlobal, session) {
        var i, count, key, switchTable, switchParam, newLatestSwitchParam, latestSwitchParam;
        var switchParamArray = [];
        var newLatestSwitchParamArray = [];

        if (isGlobal) {
            switchTable = session.getGlobalSwitchTable();
            key = "globalSwitchParamArray";
        } else {
            switchTable = session.getCurrentMapInfo().getLocalSwitchTable();
            key = "localSwitchParamArray";
        }

        count = switchTable.getSwitchCount();
        for (i = 0; i < count; i++) {
            switchParam = {};
            newLatestSwitchParam = {};

            switchParam.id = switchTable.getSwitchId(i);
            switchParam.isSwitchOn = switchTable.isSwitchOn(i);
            newLatestSwitchParam.id = switchParam.id;
            newLatestSwitchParam.isSwitchOn = switchParam.isSwitchOn;

            if (isFirstRecord) {
                switchParamArray.push(switchParam);
            } else if (latestSwitchParamArray !== undefined) {
                latestSwitchParam = latestSwitchParamArray[i];

                if (this.hasDiffProperties(switchParam, latestSwitchParam)) {
                    switchParamArray.push(switchParam);
                }
            }

            newLatestSwitchParamArray.push(newLatestSwitchParam);
        }

        if (switchParamArray.length > 0) {
            record[key] = switchParamArray;
        }

        newLatestRecord[key] = newLatestSwitchParamArray;
    },

    createVariableRecord: function (record, newLatestRecord, latestVariableParamArrays, isFirstRecord, metaSession) {
        var i, j, count, variableTable, variableParam;
        var latestVariableParam, newLatestVariableParam, newLatestVariableParamArray;
        var variableParamArray = [];
        var newLatestVariableParamArrays = [];

        // 1～5とID変数
        for (i = 0; i < 6; i++) {
            variableTable = metaSession.getVariableTable(i);
            newLatestVariableParamArray = [];

            count = variableTable.getVariableCount();
            for (j = 0; j < count; j++) {
                variableParam = {};
                newLatestVariableParam = {};

                variableParam.index = j;
                variableParam.value = variableTable.getVariable(j);
                newLatestVariableParam.index = variableParam.index;
                newLatestVariableParam.value = variableParam.value;

                if (isFirstRecord) {
                    variableParam.col = i;
                    variableParamArray.push(variableParam);
                } else if (latestVariableParamArrays !== undefined) {
                    latestVariableParam = latestVariableParamArrays[i][j];

                    if (this.hasDiffProperties(variableParam, latestVariableParam)) {
                        variableParam.col = i;
                        variableParamArray.push(variableParam);
                    }
                }

                newLatestVariableParamArray.push(newLatestVariableParam);
            }

            newLatestVariableParamArrays.push(newLatestVariableParamArray);
        }

        if (variableParamArray.length > 0) {
            record.variableParamArray = variableParamArray;
        }

        newLatestRecord.variableParamArrays = newLatestVariableParamArrays;
    },

    createEventRecord: function (record, newLatestRecord, latestEventParamArray, isFirstRecord, eventType, curSession) {
        var i, count, key, event, eventList, eventParam;
        var latestEventParam, newLatestEventParam;
        var eventParamArray = [];
        var newLatestEventParamArray = [];

        switch (eventType) {
            case EventType.PLACE:
                eventList = curSession.getPlaceEventList();
                key = "placeEventParamArray";
                break;
            case EventType.AUTO:
                eventList = curSession.getAutoEventList();
                key = "autoEventParamArray";
                break;
            case EventType.TALK:
                eventList = curSession.getTalkEventList();
                key = "talkEventParamArray";
                break;
            case EventType.OPENING:
                eventList = curSession.getOpeningEventList();
                key = "openingEventParamArray";
                break;
            case EventType.ENDING:
                eventList = curSession.getEndingEventList();
                key = "endingEventParamArray";
                break;
            case EventType.COMMUNICATION:
                eventList = curSession.getCommunicationEventList();
                key = "commuEventParamArray";
                break;
            case EventType.MAPCOMMON:
                eventList = curSession.getMapCommonEventList();
                key = "mapCommonEventParamArray";
                break;
        }

        count = eventList.getCount();
        for (i = 0; i < count; i++) {
            event = eventList.getData(i);
            eventParam = {};
            newLatestEventParam = {};

            eventParam.executedMark = event.getExecutedMark();
            newLatestEventParam.executedMark = eventParam.executedMark;

            if (isFirstRecord) {
                eventParam.index = i;
                eventParamArray.push(eventParam);
            } else if (latestEventParamArray !== undefined) {
                latestEventParam = latestEventParamArray[i];

                if (this.hasDiffProperties(eventParam, latestEventParam)) {
                    eventParam.index = i;
                    eventParamArray.push(eventParam);
                }
            }

            newLatestEventParamArray.push(newLatestEventParam);
        }

        if (eventParamArray.length > 0) {
            record[key] = eventParamArray;
        }

        newLatestRecord[key] = newLatestEventParamArray;
    },

    createPlaceShopRecord: function (record, newLatestRecord, latestPlaceShopDataParamDict, isFirstRecord, curSession) {
        var i, count, event, eventInfo, shopData, shopItemArray, inventoryNumberArray;
        var shopDataParam, latestShopDataParam, newLatestShopDataParam;
        var j, item, itemParam, newLatestItemParam, inventory;
        var eventList = curSession.getPlaceEventList();
        var placeShopDataParamArray = [];
        var newLatestPlaceShopDataParamDict = {};

        count = eventList.getCount();
        for (i = 0; i < count; i++) {
            event = eventList.getData(i);
            eventInfo = event.getPlaceEventInfo();

            if (eventInfo.getPlaceEventType() !== PlaceEventType.SHOP) {
                continue;
            }

            shopData = eventInfo.getShopData();
            shopItemArray = shopData.getShopItemArray();
            inventoryNumberArray = shopData.getInventoryNumberArray();
            shopDataParam = {};
            shopDataParam.itemParamArray = [];
            newLatestShopDataParam = {};
            newLatestShopDataParam.itemParamArray = [];

            if (latestPlaceShopDataParamDict !== undefined) {
                latestShopDataParam = latestPlaceShopDataParamDict[i];
            } else {
                latestShopDataParam = {};
            }

            for (j = 0; j < shopItemArray.length; j++) {
                item = shopItemArray[j];
                inventory = inventoryNumberArray[j];
                itemParam = {};
                itemParam.isWeapon = item.isWeapon();
                itemParam.itemId = item.getId();
                itemParam.itemLimit = item.getLimit();
                itemParam.amount = inventory.getAmount();
                newLatestItemParam = {};
                newLatestItemParam.isWeapon = itemParam.isWeapon;
                newLatestItemParam.itemId = itemParam.itemId;
                newLatestItemParam.itemLimit = itemParam.itemLimit;
                newLatestItemParam.amount = itemParam.amount;

                shopDataParam.itemParamArray.push(itemParam);
                newLatestShopDataParam.itemParamArray.push(newLatestItemParam);
            }

            if (isFirstRecord || this.hasDiffProperties(shopDataParam.itemParamArray, latestShopDataParam.itemParamArray)) {
                shopDataParam.index = i;
                placeShopDataParamArray.push(shopDataParam);
            }

            newLatestPlaceShopDataParamDict[i] = newLatestShopDataParam;
        }

        if (placeShopDataParamArray.length > 0) {
            record.placeShopDataParamArray = placeShopDataParamArray;
        }

        newLatestRecord.placeShopDataParamDict = newLatestPlaceShopDataParamDict;
    },

    createMapBoundaryRecord: function (record, newLatestRecord, latestMapBoundaryParam, isFirstRecord, curSession) {
        var mapBoundaryParam = {};
        var newLatestBoundaryParam = {};

        mapBoundaryParam.value = curSession.getMapBoundaryValue();
        newLatestBoundaryParam.value = mapBoundaryParam.value;

        if (this._srpgStudioScriptVersion >= 1287) {
            mapBoundaryParam.valueX = curSession.getMapBoundaryValueExX();
            mapBoundaryParam.valueY = curSession.getMapBoundaryValueExY();
            newLatestBoundaryParam.valueX = mapBoundaryParam.valueX;
            newLatestBoundaryParam.valueY = mapBoundaryParam.valueY;
        }

        if (isFirstRecord || this.hasDiffProperties(mapBoundaryParam, latestMapBoundaryParam)) {
            record.mapBoundaryParam = mapBoundaryParam;
        }

        newLatestRecord.mapBoundaryParam = newLatestBoundaryParam;
    },

    createMapCursorRecord: function (record, newLatestRecord, latestMapCursorParam, isFirstRecord, curSession) {
        var pos;
        var mapCursorParam = {};
        var newLatestMapCursorParam = {};

        if (isFirstRecord) {
            pos = this.getDefaultCursorPos();
            mapCursorParam.x = pos.x;
            mapCursorParam.y = pos.y;
        } else {
            mapCursorParam.x = curSession.getMapCursorX();
            mapCursorParam.y = curSession.getMapCursorY();
        }

        newLatestMapCursorParam.x = mapCursorParam.x;
        newLatestMapCursorParam.y = mapCursorParam.y;

        if (isFirstRecord || this.hasDiffProperties(mapCursorParam, latestMapCursorParam)) {
            record.mapCursorParam = mapCursorParam;
        }

        newLatestRecord.mapCursorParam = newLatestMapCursorParam;
    },

    createScrollPixelRecord: function (record, newLatestRecord, latestScrollPixelParam, isFirstRecord, curSession) {
        var scrollPixelParam = {};
        var newLatestScrollPixelParam = {};

        scrollPixelParam.x = curSession.getScrollPixelX();
        scrollPixelParam.y = curSession.getScrollPixelY();
        newLatestScrollPixelParam.x = scrollPixelParam.x;
        newLatestScrollPixelParam.y = scrollPixelParam.y;

        if (isFirstRecord || this.hasDiffProperties(scrollPixelParam, latestScrollPixelParam)) {
            record.scrollPixelParam = scrollPixelParam;
        }

        newLatestRecord.scrollPixelParam = newLatestScrollPixelParam;
    },

    createTurnCountRecord: function (record, newLatestRecord, latestTurnCount, isFirstRecord, curSession) {
        var turnCount = curSession.getTurnCount();
        var newLatestTurnCount = turnCount;

        if (isFirstRecord || turnCount !== latestTurnCount) {
            record.turnCount = turnCount;
        }

        newLatestRecord.turnCount = newLatestTurnCount;
    },

    createRelativeTurnCountRecord: function (record, newLatestRecord, latestRelativeTurnCount, isFirstRecord, curSession) {
        var relativeTurnCount = curSession.getRelativeTurnCount();
        var newLatestRelativeTurnCount = relativeTurnCount;

        if (isFirstRecord || relativeTurnCount !== latestRelativeTurnCount) {
            record.relativeTurnCount = relativeTurnCount;
        }

        newLatestRecord.relativeTurnCount = newLatestRelativeTurnCount;
    },

    createTurnTypeRecord: function (record, newLatestRecord, latestTurnType, isFirstRecord, curSession) {
        var turnType = curSession.getTurnType();
        var newLatestTurnType = turnType;

        if (isFirstRecord || turnType !== latestTurnType) {
            record.turnType = turnType;
        }

        newLatestRecord.turnType = newLatestTurnType;
    },

    createTrophyRecord: function (record, newLatestRecord, latestTrophyParamArray, isFirstRecord, curSession) {
        var i, trophy, trophyFlag, item, trophyParam, newLatestTrophyParam;
        var trophyPoolList = curSession.getTrophyPoolList();
        var trophyParamArray = [];
        var newLatestTrophyParamArray = [];
        var count = trophyPoolList.getCount();

        for (i = 0; i < count; i++) {
            trophy = trophyPoolList.getData(i);
            trophyFlag = trophy.getFlag();
            trophyParam = {};
            newLatestTrophyParam = {};
            trophyParam.flag = trophyFlag;
            newLatestTrophyParam.flag = trophyFlag;

            switch (trophyFlag) {
                case TrophyFlag.ITEM:
                    item = trophy.getItem();
                    trophyParam.isWeapon = item.isWeapon();
                    trophyParam.itemId = item.getId();
                    trophyParam.itemLimit = item.getLimit();
                    newLatestTrophyParam.isWeapon = trophyParam.isWeapon;
                    newLatestTrophyParam.itemId = trophyParam.itemId;
                    newLatestTrophyParam.itemLimit = trophyParam.itemLimit;
                    break;
                case TrophyFlag.GOLD:
                    trophyParam.gold = trophy.getGold();
                    newLatestTrophyParam.gold = trophyParam.gold;
                    break;
                case TrophyFlag.BONUS:
                    trophyParam.bonus = trophy.getBonus();
                    newLatestTrophyParam.bonus = trophyParam.bonus;
                    break;
            }

            trophyParamArray.push(trophyParam);
            newLatestTrophyParamArray.push(newLatestTrophyParam);
        }

        if (isFirstRecord || this.hasDiffProperties(trophyParamArray, latestTrophyParamArray)) {
            record.trophyParamArray = trophyParamArray;
        }

        newLatestRecord.trophyParamArray = newLatestTrophyParamArray;
    },

    createMapChipRecord: function (record, newLatestRecord, latestHandleParamArray, isFirstRecord, isLayer, curSession) {
        var x, y, key, handle, handleParam, latestHandleParam, newLatestHandleParam;
        var mapData = curSession.getCurrentMapInfo();
        var mapWidth = mapData.getMapWidth();
        var mapHeight = mapData.getMapHeight();
        var handleParamArray = [];
        var newLatestHandleParamArray = [];

        if (isLayer) {
            key = "layerMapChipHandleParamArray";
        } else {
            key = "mapChipHandleParamArray";
        }

        for (y = 0; y < mapHeight; y++) {
            newLatestHandleParamArray.push([]);

            for (x = 0; x < mapWidth; x++) {
                handle = curSession.getMapChipGraphicsHandle(x, y, isLayer);
                handleParam = {};
                newLatestHandleParam = {};
                latestHandleParam = {};

                handleParam.mx = x;
                handleParam.my = y;
                handleParam.is = handle.getHandleType() === ResourceHandleType.RUNTIME;
                handleParam.id = handle.getResourceId();
                handleParam.c = handle.getColorIndex();
                handleParam.sx = handle.getSrcX();
                handleParam.sy = handle.getSrcY();
                newLatestHandleParam.mx = x;
                newLatestHandleParam.my = y;
                newLatestHandleParam.is = handleParam.is;
                newLatestHandleParam.id = handleParam.id;
                newLatestHandleParam.c = handleParam.c;
                newLatestHandleParam.sx = handleParam.sx;
                newLatestHandleParam.sy = handleParam.sy;

                if (latestHandleParamArray !== undefined) {
                    latestHandleParam = latestHandleParamArray[y][x];
                }

                if (!isFirstRecord && this.hasDiffProperties(handleParam, latestHandleParam)) {
                    handleParamArray.push(handleParam);
                    this.addBeforeChangedMapChip(latestHandleParam, isLayer);
                }

                newLatestHandleParamArray[y].push(newLatestHandleParam);
            }
        }

        if (handleParamArray.length > 0) {
            record[key] = handleParamArray;
        }

        newLatestRecord[key] = newLatestHandleParamArray;
    },

    createMusicRecord: function (record, newLatestRecord, latestMusicHandleParam, isFirstRecord) {
        var handle = root.getMediaManager().getActiveMusicHandle();
        var musicHandleParam = {};
        var newLatestMusicHandleParam = {};

        musicHandleParam.isRuntime = handle.getHandleType() === ResourceHandleType.RUNTIME;
        musicHandleParam.resourceId = handle.getResourceId();
        newLatestMusicHandleParam.isRuntime = musicHandleParam.isRuntime;
        newLatestMusicHandleParam.resourceId = musicHandleParam.resourceId;

        if (isFirstRecord || this.hasDiffProperties(musicHandleParam, latestMusicHandleParam)) {
            record.musicHandleParam = musicHandleParam;
        }

        newLatestRecord.musicHandleParam = newLatestMusicHandleParam;
    },

    createScreenEffectRecord: function (record, newLatestRecord, latestScreenEffectParam, isFirstRecord) {
        var screenEffectParam = {};
        var newLatestScreenEffectParam = {};
        var screenEffect = root.getScreenEffect();

        screenEffectParam.color = screenEffect.getColor();
        screenEffectParam.alpha = screenEffect.getAlpha();
        screenEffectParam.range = screenEffect.getRange();
        newLatestScreenEffectParam.color = screenEffectParam.color;
        newLatestScreenEffectParam.alpha = screenEffectParam.alpha;
        newLatestScreenEffectParam.range = screenEffectParam.range;

        if (isFirstRecord || this.hasDiffProperties(screenEffectParam, latestScreenEffectParam)) {
            record.screenEffectParam = screenEffectParam;
        }

        newLatestRecord.screenEffectParam = newLatestScreenEffectParam;
    },

    createConditionRecord: function (record, newLatestRecord, latestConditionArray, isFirstRecord, isVictory, curSession) {
        var i;
        var mapData = curSession.getCurrentMapInfo();
        var conditionArray = [];
        var newLatestConditionArray = [];
        var key = isVictory ? "victoryConditionArray" : "defeatConditionArray";

        for (i = 0; i < 3; i++) {
            if (isVictory) {
                conditionArray.push(mapData.getVictoryCondition(i));
            } else {
                conditionArray.push(mapData.getDefeatCondition(i));
            }

            newLatestConditionArray.push(conditionArray[i]);
        }

        if (isFirstRecord || this.hasDiffProperties(conditionArray, latestConditionArray)) {
            record[key] = conditionArray;
        }

        newLatestRecord[key] = newLatestConditionArray;
    },

    createShopRecord: function (record, newLatestRecord, latestShopDataParamArray, isFirstRecord, curSession) {
        var i, count, shopData, shopDataParam, latestShopDataParam, newLatestShopDataParam;
        var j, item, itemParam, newLatestItemParam, inventory, shopItemArray, inventoryNumberArray;
        var mapData = curSession.getCurrentMapInfo();
        var shopDataList = mapData.getShopDataList();
        var shopDataParamArray = [];
        var newLatestShopDataParamArray = [];

        count = shopDataList.getCount();
        for (i = 0; i < count; i++) {
            shopData = shopDataList.getData(i);
            shopItemArray = shopData.getShopItemArray();
            inventoryNumberArray = shopData.getInventoryNumberArray();
            shopDataParam = {};
            shopDataParam.index = i;
            shopDataParam.itemParamArray = [];
            newLatestShopDataParam = {};
            newLatestShopDataParam.itemParamArray = [];

            if (latestShopDataParamArray !== undefined) {
                latestShopDataParam = latestShopDataParamArray[i];
            } else {
                latestShopDataParam = {};
            }

            for (j = 0; j < shopItemArray.length; j++) {
                item = shopItemArray[j];
                inventory = inventoryNumberArray[j];
                itemParam = {};
                itemParam.isWeapon = item.isWeapon();
                itemParam.itemId = item.getId();
                itemParam.itemLimit = item.getLimit();
                itemParam.amount = inventory.getAmount();
                newLatestItemParam = {};
                newLatestItemParam.isWeapon = itemParam.isWeapon;
                newLatestItemParam.itemId = itemParam.itemId;
                newLatestItemParam.itemLimit = itemParam.itemLimit;
                newLatestItemParam.amount = itemParam.amount;

                shopDataParam.itemParamArray.push(itemParam);
                newLatestShopDataParam.itemParamArray.push(newLatestItemParam);
            }

            if (isFirstRecord || this.hasDiffProperties(shopDataParam.itemParamArray, latestShopDataParam.itemParamArray)) {
                shopDataParamArray.push(shopDataParam);
            }

            newLatestShopDataParamArray.push(newLatestShopDataParam);
        }

        if (shopDataParamArray.length > 0) {
            record.shopDataParamArray = shopDataParamArray;
        }

        newLatestRecord.shopDataParamArray = newLatestShopDataParamArray;
    },

    createCurSeedRecord: function (record, newLatestRecord, latestCurSeed, isFirstRecord) {
        var curSeed = Probability.getCurSeed();

        if (isFirstRecord || curSeed !== latestCurSeed) {
            record.curSeed = curSeed;
        }

        newLatestRecord.curSeed = curSeed;
    },

    createMapCustomRecord: function (record, newLatestRecord, latestCustom, isFirstRecord, curSession) {
        var mapData = curSession.getCurrentMapInfo();
        var custom = mapData.custom;
        var customText = JSONParser.stringify(custom);

        if (isFirstRecord || this.hasDiffProperties(custom, latestCustom)) {
            record.custom = JSONParser.parse(customText);
        }

        newLatestRecord.custom = JSONParser.parse(customText);
    },

    addUnit: function (unit) {
        if (unit === null) {
            return;
        }

        this._unitDict[unit.getId()] = unit;
    },

    addUnitById: function (unitType, unitGroup, id) {
        var i, count, unit, unitList;
        var realId = id + 65536 * unitGroup;

        if (unitType === UnitType.PLAYER) {
            unitList = PlayerList.getMainList();
        } else if (unitType === UnitType.ENEMY) {
            unitList = EnemyList.getMainList();
        } else if (unitType === UnitType.ALLY) {
            unitList = AllyList.getMainList();
        }

        count = unitList.getCount();
        for (i = 0; i < count; i++) {
            unit = unitList.getData(i);

            if (unit.getId() === realId) {
                this._unitDict[realId] = unit;
                break;
            }
        }
    },

    addBeforeChangedMapChip: function (latestHandleParam, isLayer) {
        var x, y, key;
        var beforeChangedMapChipDict;

        if (latestHandleParam.mx === undefined) {
            return;
        }

        x = latestHandleParam.mx;
        y = latestHandleParam.my;
        key = "" + x + "_" + y;

        if (isLayer) {
            beforeChangedMapChipDict = this._beforeChangedLayerMapChipDict;
        } else {
            beforeChangedMapChipDict = this._beforeChangedMapChipDict;
        }

        if (beforeChangedMapChipDict[key] === undefined) {
            beforeChangedMapChipDict[key] = JSONParser.deepCopy(latestHandleParam);
        }
    },

    setIsIgnoredSwitch: function (isGlobal, index, isIgnored) {
        if (isGlobal) {
            this._isIgnoredGlobalSwitchArray[index] = isIgnored;
        } else {
            this._isIgnoredLocalSwitchArray[index] = isIgnored;
        }
    },

    getRecordTitleArray: function () {
        var i, count, record, recordType, unitName, text, recordTitle, placeCommandName, talkCommandName;
        var recordTitleArray = [];
        var recordArray = this._recordArray;

        count = recordArray.length;
        for (i = 0; i < count; i++) {
            record = recordArray[i];
            recordType = record.recordType;
            placeCommandName = this.getPlaceCommandName();
            talkCommandName = this.getTalkCommandName();
            unitName = record.unitName;

            if (recordType === RecordType.UNIT_PLACECOMMAND) {
                text = unitName + PlaceCommandRecordTitleString[placeCommandName];
            } else if (recordType === RecordType.UNIT_TALK) {
                text = unitName + TalkCommandRecordTitleString[talkCommandName];
            } else {
                text = unitName + RecordTitleString[recordType];
            }

            if (recordType === RecordType.TURN_START) {
                text = record.turnCount + text;
            }

            recordTitle = {
                title: text,
                isTurnStart: recordType === RecordType.TURN_START,

                getTitle: function () {
                    return this.title;
                }
            };

            recordTitleArray.push(recordTitle);
        }

        return recordTitleArray;
    },

    canRewind: function () {
        var remainRewindCount = this.getRemainRewindCount();
        var switchTable = root.getMetaSession().getGlobalSwitchTable();
        var index = switchTable.getSwitchIndexFromId(CAN_REWIND_SWITCH_ID);

        if (remainRewindCount === 0) {
            return false;
        }

        if (!switchTable.isSwitchOn(index)) {
            return false;
        }

        return true;
    },

    getmaxRewindCount: function () {
        var globalCustom = this.getGlobalCustom();
        return globalCustom.maxRewindCount;
    },

    setMaxRewindCount: function (maxRewindCount) {
        var globalCustom = this.getGlobalCustom();
        globalCustom.maxRewindCount = maxRewindCount === undefined ? -1 : maxRewindCount;
    },

    getRemainRewindCount: function () {
        var globalCustom = this.getGlobalCustom();
        return globalCustom.remainRewindCount;
    },

    setRemainRewindCount: function (remainRewindCount) {
        var globalCustom = this.getGlobalCustom();
        globalCustom.remainRewindCount = remainRewindCount;
    },

    initRemainRewindCount: function () {
        var maxRewindCount = this.getmaxRewindCount();
        this.setRemainRewindCount(maxRewindCount);
    },

    decrementRemainRewindCount: function () {
        var remainRewindCount = this.getRemainRewindCount();
        this.setRemainRewindCount(remainRewindCount - 1);
    },

    isRepeatMoveMode: function () {
        return this._isRepeatMoveMode;
    },

    setIsRepeatMoveMode: function (isRepeatMoveMode) {
        this._isRepeatMoveMode = isRepeatMoveMode;
    },

    getCurRecordType: function () {
        return this._curRecordType;
    },

    setCurRecordType: function (recordType) {
        this._curRecordType = recordType;
    },

    getPlaceCommandName: function () {
        return this._placeCommandName;
    },

    setPlaceCommandName: function (placeCommandName) {
        this._placeCommandName = placeCommandName;
    },

    getTalkCommandName: function () {
        return this._talkCommandName;
    },

    setTalkCommandName: function (talkCommandName) {
        this._talkCommandName = talkCommandName;
    },

    getCurActionUnit: function () {
        return this._curActionUnit;
    },

    setCurActionUnit: function (curActionUnit) {
        this._curActionUnit = curActionUnit;
    },

    isRewinded: function () {
        return this._isRewinded;
    },

    setRewinded: function (isRewinded) {
        this._isRewinded = isRewinded;
    },

    isOtherPhazeRewinded: function () {
        return this._isOtherPhazeRewinded;
    },

    setOtherPhazeRewinded: function (isOtherPhazeRewinded) {
        this._isOtherPhazeRewinded = isOtherPhazeRewinded;
    },

    getDefaultCursorPos: function () {
        var i, unit;
        var targetUnit = null;
        var list = PlayerList.getSortieList();
        var count = list.getCount();

        for (i = 0; i < count; i++) {
            unit = list.getData(i);
            if (unit.getImportance() === ImportanceType.LEADER) {
                targetUnit = unit;
                break;
            }
        }

        if (targetUnit === null) {
            targetUnit = list.getData(0);
        }

        if (targetUnit !== null) {
            return createPos(targetUnit.getMapX(), targetUnit.getMapY());
        }

        return null;
    },

    getGlobalCustom: function () {
        return root.getMetaSession().global;
    },

    deleteGlobalCustomProp: function (propName) {
        var globalCustom = this.getGlobalCustom();

        delete globalCustom[propName];
    },

    hasDiffProperties: function (firstValue, secondValue) {
        var i, key, firstObjPropsCount, secondObjPropsCount;

        if (typeof firstValue !== typeof secondValue) {
            return true;
        }

        if (!(firstValue instanceof Object)) {
            return firstValue !== secondValue;
        }

        if (firstValue instanceof Array) {
            if (firstValue.length !== secondValue.length) {
                return true;
            }

            for (i = 0; i < firstValue.length; i++) {
                if (this.hasDiffProperties(firstValue[i], secondValue[i])) {
                    return true;
                }
            }

            return false;
        }

        firstObjPropsCount = 0;
        secondObjPropsCount = 0;

        for (key in firstValue) {
            if (this.hasDiffProperties(firstValue[key], secondValue[key])) {
                return true;
            }

            firstObjPropsCount += 1;
        }

        for (key in secondValue) {
            secondObjPropsCount += 1;
        }

        return firstObjPropsCount !== secondObjPropsCount;
    }
};

/*-----------------------------------------------------------------------------------------------------------------
    JSONパーサ
    SRPG StudioのJavaScriptのバージョンではJSONオブジェクトが使えないので自前で実装する
*----------------------------------------------------------------------------------------------------------------*/
var JSONParser = {
    // オブジェクトをディープコピーする
    deepCopy: function (value) {
        return this.parse(this.stringify(value));
    },

    // オブジェクトをJSON文字列に変換する
    stringify: function (value) {
        var i, key, strArray;

        if (!(value instanceof Object)) {
            return typeof value === "string" ? '"' + value + '"' : "" + value;
        }

        strArray = [];

        if (value instanceof Array) {
            for (i = 0; i < value.length; i++) {
                strArray.push(this.stringify(value[i]));
            }

            return "[" + strArray.join(",") + "]";
        }

        for (key in value) {
            strArray.push('"' + key + '":' + this.stringify(value[key]));
        }

        return "{" + strArray.join(",") + "}";
    },

    // JSON文字列をオブジェクトに変換する
    parse: function (jsonText) {
        var token, obj;
        var lexer = createLexer(jsonText);

        token = lexer.getNextToken();
        obj = this.valueParse(lexer, token);

        if (lexer.getNextToken().tokenType === TokenType.EOF) {
            return obj;
        }

        throw new Error("無効なトークンが検出されました。");
    },

    valueParse: function (lexer, token) {
        var value;
        var tokenType = token.tokenType;

        switch (tokenType) {
            case TokenType.TRUE:
                value = true;
                break;
            case TokenType.FALSE:
                value = false;
                break;
            case TokenType.NULL:
                value = null;
                break;
            case TokenType.UNDEFINED:
                value = undefined;
                break;
            case TokenType.STRING:
                value = token.value;
                break;
            case TokenType.NUMBER:
                value = token.value;
                break;
            case TokenType.LEFT_SQUARE_BRACKET:
                value = this.arrayParse(lexer);
                break;
            case TokenType.LEFT_CURLY_BRACKET:
                value = this.objectParse(lexer);
                break;
            default:
                new Error("無効なトークンが検出されました。");
        }

        return value;
    },

    arrayParse: function (lexer) {
        var token, tokenType;
        var array = [];
        var state = ArrayParseStateType.START;

        while (true) {
            token = lexer.getNextToken();
            tokenType = token.tokenType;

            if (tokenType === TokenType.EOF) {
                break;
            }

            switch (state) {
                case ArrayParseStateType.START:
                    if (tokenType === TokenType.RIGHT_SQUARE_BRACKET) {
                        return array;
                    }

                    array.push(this.valueParse(lexer, token));
                    state = ArrayParseStateType.VALUE;
                    break;
                case ArrayParseStateType.VALUE:
                    if (tokenType === TokenType.RIGHT_SQUARE_BRACKET) {
                        return array;
                    }

                    if (tokenType === TokenType.COMMA) {
                        state = ArrayParseStateType.COMMA;
                        break;
                    }

                    new Error("無効なトークンが検出されました。");
                case ArrayParseStateType.COMMA:
                    array.push(this.valueParse(lexer, token));
                    state = ArrayParseStateType.VALUE;
                    break;
            }
        }

        throw new Error("配列の終端がありません。");
    },

    objectParse: function (lexer) {
        var token, tokenType;
        var object = {};
        var key = "";
        var state = ObjectParseStateType.START;

        while (true) {
            token = lexer.getNextToken();
            tokenType = token.tokenType;

            if (tokenType === TokenType.EOF) {
                break;
            }

            switch (state) {
                case ObjectParseStateType.START:
                    if (tokenType === TokenType.RIGHT_CURLY_BRACKET) {
                        return object;
                    }

                    if (tokenType === TokenType.STRING) {
                        key = token.value;
                        state = ObjectParseStateType.KEY;
                        break;
                    }

                    throw new Error("無効なトークンが検出されました。");
                case ObjectParseStateType.KEY:
                    if (tokenType === TokenType.COLON) {
                        state = ObjectParseStateType.COLON;
                        break;
                    }

                    throw new Error("無効なトークンが検出されました。");
                case ObjectParseStateType.COLON:
                    object[key] = this.valueParse(lexer, token);
                    state = ObjectParseStateType.VALUE;
                    break;
                case ObjectParseStateType.VALUE:
                    if (tokenType === TokenType.RIGHT_CURLY_BRACKET) {
                        return object;
                    }

                    if (tokenType === TokenType.COMMA) {
                        state = ObjectParseStateType.COMMA;
                        break;
                    }

                    throw new Error("無効なトークンが検出されました。");
                case ObjectParseStateType.COMMA:
                    if (tokenType === TokenType.STRING) {
                        key = token.value;
                        state = ObjectParseStateType.KEY;
                        break;
                    }

                    throw new Error("無効なトークンが検出されました。");
            }
        }

        throw new Error("オブジェクトの終端がありません。");
    }
};

// 字句解析器を返す関数
var createLexer = function (text) {
    var length = text.length;
    var position = 0;

    return {
        current: function () {
            return text.charAt(position);
        },

        consume: function () {
            var ch;

            if (position >= length) {
                return null;
            }

            ch = this.current();
            position++;

            return ch;
        },

        getNextToken: function () {
            var ch, token;

            do {
                ch = this.consume();

                if (ch === null) {
                    // 終端
                    return { tokenType: TokenType.EOF, value: null };
                }
            } while (this.isSkipCharacter(ch));

            switch (ch) {
                case "{":
                    token = { tokenType: TokenType.LEFT_CURLY_BRACKET, value: null };
                    break;
                case "}":
                    token = { tokenType: TokenType.RIGHT_CURLY_BRACKET, value: null };
                    break;
                case "[":
                    token = { tokenType: TokenType.LEFT_SQUARE_BRACKET, value: null };
                    break;
                case "]":
                    token = { tokenType: TokenType.RIGHT_SQUARE_BRACKET, value: null };
                    break;
                case ":":
                    token = { tokenType: TokenType.COLON, value: null };
                    break;
                case ",":
                    token = { tokenType: TokenType.COMMA, value: null };
                    break;
                case '"':
                    token = this.getStringToken();
                    break;
                case "-":
                    token = this.getNumberToken(ch);
                    break;
                case "0":
                    token = this.getNumberToken(ch);
                    break;
                case "1":
                    token = this.getNumberToken(ch);
                    break;
                case "2":
                    token = this.getNumberToken(ch);
                    break;
                case "3":
                    token = this.getNumberToken(ch);
                    break;
                case "4":
                    token = this.getNumberToken(ch);
                    break;
                case "5":
                    token = this.getNumberToken(ch);
                    break;
                case "6":
                    token = this.getNumberToken(ch);
                    break;
                case "7":
                    token = this.getNumberToken(ch);
                    break;
                case "8":
                    token = this.getNumberToken(ch);
                    break;
                case "9":
                    token = this.getNumberToken(ch);
                    break;
                case "t":
                    token = this.getLiteralToken("true", TokenType.TRUE);
                    break;
                case "f":
                    token = this.getLiteralToken("false", TokenType.FALSE);
                    break;
                case "n":
                    token = this.getLiteralToken("null", TokenType.NULL);
                    break;
                case "u":
                    token = this.getLiteralToken("undefined", TokenType.UNDEFINED);
                    break;
                default:
                    throw new Error("無効な文字が検出されました。 " + ch);
            }

            return token;
        },

        isSkipCharacter: function (ch) {
            return ch === " " || ch === "\n" || ch === "\r" || ch === "\t";
        },

        getLiteralToken: function (expectedStr, tokenType) {
            var i, count, ch;
            str = expectedStr.charAt(0);
            count = expectedStr.length;

            for (i = 1; i < count; i++) {
                ch = this.consume();

                if (ch === null) {
                    throw new Error("予期せぬ文字列が検出されました。");
                }

                str += ch;
            }

            if (str !== expectedStr) {
                throw new Error("予期せぬリテラルが検出されました:" + str);
            }

            return { tokenType: tokenType, value: null };
        },

        getStringToken: function () {
            var ch;
            var str = "";
            var escapeChar = {
                '"': '"',
                "\\": "\\",
                b: "b",
                f: "\f",
                n: "\n",
                r: "\r",
                t: "\t"
            };

            while (true) {
                ch = this.consume();

                if (ch === null) {
                    break;
                }

                if (ch === '"') {
                    return { tokenType: TokenType.STRING, value: str };
                }

                if (ch !== "\\") {
                    str += ch;
                    continue;
                }

                ch = this.consume();

                if (typeof escapeChar[ch] === "string") {
                    str += escapeChar[ch];
                } else {
                    str += "\\" + ch;
                }
            }

            throw new Error("文字列の終端がありません。");
        },

        getNumberToken: function (ch) {
            var state, lastCh;
            var str = ch;
            var isEnd = false;
            var isDigit = function (ch) {
                return "0" <= ch && ch <= "9";
            };
            var isDigit19 = function (ch) {
                return "1" <= ch && ch <= "9";
            };
            var isExp = function (ch) {
                return ch === "e" || ch === "E";
            };

            switch (ch) {
                case "-":
                    state = GetNumberTokenStateType.MINUS;
                    break;
                case "0":
                    state = GetNumberTokenStateType.INT_ZERO;
                    break;
                default:
                    state = GetNumberTokenStateType.INT;
            }

            while (true) {
                ch = this.current();

                switch (state) {
                    case GetNumberTokenStateType.INT:
                        if (isDigit(ch)) {
                            str += this.consume();
                            break;
                        }

                        if (ch === ".") {
                            str += this.consume();
                            state = GetNumberTokenStateType.DECIMAL_POINT;
                            break;
                        }

                        if (isExp(ch)) {
                            str += this.consume();
                            state = GetNumberTokenStateType.EXP;
                            break;
                        }

                        isEnd = true;
                        break;
                    case GetNumberTokenStateType.MINUS:
                        if (isDigit19(ch)) {
                            str += this.consume();
                            state = GetNumberTokenStateType.INT;
                            break;
                        }

                        if (ch === "0") {
                            str += this.consume();
                            state = GetNumberTokenStateType.INT_ZERO;
                            break;
                        }

                        isEnd = true;
                        break;
                    case GetNumberTokenStateType.INT_ZERO:
                        if (ch === ".") {
                            str += this.consume();
                            state = GetNumberTokenStateType.DECIMAL_POINT;
                            break;
                        }

                        if (isDigit(ch)) {
                            throw new Error("無効な数値を検出しました:" + str + ch);
                        }

                        isEnd = true;
                        break;
                    case GetNumberTokenStateType.DECIMAL_POINT:
                        if (isDigit(ch)) {
                            str += this.consume();
                            state = GetNumberTokenStateType.DECIMAL_POINT_INT;
                            break;
                        }

                        isEnd = true;
                        break;
                    case GetNumberTokenStateType.DECIMAL_POINT_INT:
                        if (isDigit(ch)) {
                            str += this.consume();
                            break;
                        }

                        if (isExp(ch)) {
                            str += this.consume();
                            state = GetNumberTokenStateType.EXP;
                            break;
                        }

                        isEnd = true;
                        break;
                    case GetNumberTokenStateType.EXP:
                        if (isDigit(ch) || ch === "-" || ch === "+") {
                            str += this.consume();
                            state = GetNumberTokenStateType.EXP_INT;
                            break;
                        }

                        isEnd = true;
                        break;
                    case GetNumberTokenStateType.EXP_INT:
                        if (isDigit(ch)) {
                            str += this.consume();
                            break;
                        }

                        isEnd = true;
                        break;
                    default:
                        isEnd = true;
                }

                if (isEnd) {
                    break;
                }
            }

            lastCh = str.charAt(str.length - 1);

            if (isDigit(lastCh)) {
                return { tokenType: TokenType.NUMBER, value: Number(str) };
            }

            throw new Error("無効な数値を検出しました:" + str + ch);
        }
    };
};

// 配列解析時の状態の種類
var ArrayParseStateType = {
    START: 0,
    VALUE: 1,
    COMMA: 2
};

// オブジェクト解析時の状態の種類
var ObjectParseStateType = {
    START: 0,
    KEY: 1,
    COLON: 2,
    VALUE: 3,
    COMMA: 4
};

// トークンの種類
var TokenType = {
    LEFT_CURLY_BRACKET: 0,
    RIGHT_CURLY_BRACKET: 1,
    LEFT_SQUARE_BRACKET: 2,
    RIGHT_SQUARE_BRACKET: 3,
    COLON: 4,
    COMMA: 5,
    NUMBER: 6,
    STRING: 7,
    TRUE: 8,
    FALSE: 9,
    NULL: 10,
    UNDEFINED: 11,
    EOF: 12
};

// 数値トークン解析時の状態の種類
var GetNumberTokenStateType = {
    INT: 0,
    MINUS: 1,
    INT_ZERO: 2,
    DECIMAL_POINT: 3,
    DECIMAL_POINT_INT: 4,
    EXP: 5,
    EXP_INT: 6
};

(function () {
    /*-----------------------------------------------------------------------------------------------------------------
        ロード時にRewindTimeManagerのプロパティを初期化する
    *----------------------------------------------------------------------------------------------------------------*/
    LoadSaveScreen._executeLoad = function () {
        var object = this._scrollbar.getObject();

        if (object.isCompleteFile() || object.getMapInfo() !== null) {
            SceneManager.setEffectAllRange(true);

            // 内部でroot.changeSceneが呼ばれ、セーブファイルに記録されているシーンに変更される。
            root.getLoadSaveManager().loadFile(this._scrollbar.getIndex());
            if (root.getBaseScene() === SceneType.FREE) {
                RewindTimeManager.loadData();
            }
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        セーブ時に一部のプロパティをカスパラに保存する
        動作を軽量化するため、セーブ処理が終わったら当該カスパラはdeleteする
    *----------------------------------------------------------------------------------------------------------------*/
    LoadSaveScreen._executeSave = function () {
        var index = this._scrollbar.getIndex();

        if (root.getBaseScene() === SceneType.FREE) {
            RewindTimeManager.saveData();
        }

        root.getLoadSaveManager().saveFile(index, this._screenParam.scene, this._screenParam.mapId, this._getCustomObject());

        if (root.getBaseScene() === SceneType.FREE) {
            RewindTimeManager.deleteGlobalCustomProp("recordArrayJSON");
            RewindTimeManager.deleteGlobalCustomProp("beforeChangedMapChipDictJSON");
            RewindTimeManager.deleteGlobalCustomProp("beforeChangedLayerMapChipDictJSON");
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        擬似乱数を実装する
        SRPG Studioの組み込みの擬似乱数はシードのsetはできてもgetはできないので、
        乱数の巻き戻しを実現するには自前で用意する必要がある
        生成アルゴリズムは暫定的に採用したものなので、そのうち見直すかもしれない
    *----------------------------------------------------------------------------------------------------------------*/
    Probability.getRandomNumber = function () {
        var curSeed = this.getCurSeed();
        var randNum = this.numberToUint(curSeed);
        var nextSeed = this.xorShift(curSeed);

        this.setCurSeed(nextSeed);

        return randNum % 32768;
    };

    Probability.xorShift = function (x) {
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 15;

        return x;
    };

    Probability.numberToUint = function (x) {
        return x < 0 ? x + 0x100000000 : x;
    };

    Probability.initSeed = function () {
        var globalCustom = root.getMetaSession().global;
        var min = 1;
        var max = 2147483647;

        globalCustom.curSeed = Math.floor(Math.random() * (max - min)) + min;
    };

    Probability.getCurSeed = function () {
        var globalCustom = root.getMetaSession().global;

        return globalCustom.curSeed;
    };

    Probability.setCurSeed = function (curSeed) {
        var globalCustom = root.getMetaSession().global;

        globalCustom.curSeed = curSeed;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        root.getRandomNumber()を使用している箇所をProbability.getRandomNumber()に置き換える
    *----------------------------------------------------------------------------------------------------------------*/
    RestrictedExperienceControl._createObjectArray = function (unit) {
        var i, obj;
        var count = ParamGroup.getParameterCount();
        var objectArray = [];
        var weapon = ItemControl.getEquippedWeapon(unit);

        for (i = 0; i < count; i++) {
            obj = {};
            obj.index = i;
            obj.percent = ParamGroup.getGrowthBonus(unit, i) + ParamGroup.getUnitTotalGrowthBonus(unit, i, weapon);
            obj.value = ExperienceControl._getGrowthValue(obj.percent);
            // 同一成長率のパラメータが存在した場合に、どちらのパラメータが優先されるかは乱数で決める
            obj.rand = Probability.getRandomNumber() % count;

            objectArray[i] = obj;
        }

        return objectArray;
    };

    Miscellaneous.getRandomBackgroundHandle = function () {
        var isRuntime = false;
        var list, count, graphicsIndex, colorIndex, pic, graphicsId;

        // 最初にオリジナル背景を調べる
        list = root.getBaseData().getGraphicsResourceList(GraphicsType.EVENTBACK, isRuntime);
        count = list.getCount();
        if (count === 0) {
            isRuntime = true;
            list = root.getBaseData().getGraphicsResourceList(GraphicsType.EVENTBACK, isRuntime);
            count = list.getCount();
        }

        graphicsIndex = Probability.getRandomNumber() % count;

        // 0、1、2(朝、夕、夜)のいずれかの色を取得
        colorIndex = Probability.getRandomNumber() % 3;

        pic = list.getCollectionData(graphicsIndex, colorIndex);
        if (pic !== null) {
            graphicsId = pic.getId();
        } else {
            colorIndex = 0;
            pic = list.getCollectionData(graphicsIndex, colorIndex);
            if (pic !== null) {
                graphicsId = pic.getId();
            } else {
                graphicsId = list.getCollectionData(0, 0).getId();
            }
        }

        return root.createResourceHandle(isRuntime, graphicsId, colorIndex, 0, 0);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        援軍出現時の処理
    *----------------------------------------------------------------------------------------------------------------*/
    var alias00000 = ReinforcementChecker._appearUnit;
    ReinforcementChecker._appearUnit = function (pageData, x, y) {
        var unit = alias00000.call(this, pageData, x, y);

        if (unit !== null) {
            RewindTimeManager.addUnit(unit);
        }

        return unit;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        各ユニットコマンドに対応するレコードの種類を設定する
    *----------------------------------------------------------------------------------------------------------------*/
    // 攻撃
    var alias000 = UnitCommand.Attack.openCommand;
    UnitCommand.Attack.openCommand = function () {
        alias000.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_ATTACK);
    };

    // 待機
    var alias001 = UnitCommand.Wait.openCommand;
    UnitCommand.Wait.openCommand = function () {
        var curRecordType = RewindTimeManager.getCurRecordType();
        var isRepeatMoveMode = RewindTimeManager.isRepeatMoveMode();

        if (!isRepeatMoveMode || curRecordType !== RecordType.UNIT_WAIT) {
            RewindTimeManager.setCurRecordType(RecordType.UNIT_WAIT);
        }

        alias001.call(this);
    };

    // 占拠
    var alias002 = UnitCommand.Occupation.openCommand;
    UnitCommand.Occupation.openCommand = function () {
        alias002.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_OCCUPATION);
    };

    // 宝箱
    var alias003 = UnitCommand.Treasure.openCommand;
    UnitCommand.Treasure.openCommand = function () {
        alias003.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_TREASURE);
    };

    // 村
    var alias004 = UnitCommand.Village.openCommand;
    UnitCommand.Village.openCommand = function () {
        alias004.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_VILLAGE);
    };

    // 店
    var alias005 = UnitCommand.Shop.openCommand;
    UnitCommand.Shop.openCommand = function () {
        alias005.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_SHOP);
    };

    // 扉
    var alias006 = UnitCommand.Gate.openCommand;
    UnitCommand.Gate.openCommand = function () {
        alias006.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_GATE);
    };

    // 盗む
    var alias007 = UnitCommand.Steal.openCommand;
    UnitCommand.Steal.openCommand = function () {
        alias007.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_STEAL);
    };

    // 杖
    var alias008 = UnitCommand.Wand.openCommand;
    UnitCommand.Wand.openCommand = function () {
        alias008.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_WAND);
    };

    // 情報
    var alias009 = UnitCommand.Information.openCommand;
    UnitCommand.Information.openCommand = function () {
        alias009.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_WAIT);
    };

    // アイテム
    var alias010 = UnitCommand.Item.openCommand;
    UnitCommand.Item.openCommand = function () {
        alias010.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_ITEM);
    };

    // 交換
    var alias011 = UnitCommand.Trade.openCommand;
    UnitCommand.Trade.openCommand = function () {
        alias011.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_WAIT);
    };

    // ストック
    var alias012 = UnitCommand.Stock.openCommand;
    UnitCommand.Stock.openCommand = function () {
        alias012.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_WAIT);
    };

    // 形態変化
    var alias013 = UnitCommand.Metamorphoze.openCommand;
    UnitCommand.Metamorphoze.openCommand = function () {
        alias013.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_METAMORPHOZE);
    };

    // 形態変化解除
    var alias014 = UnitCommand.MetamorphozeCancel.openCommand;
    UnitCommand.MetamorphozeCancel.openCommand = function () {
        alias014.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_METAMORCANCEL);
    };

    // フュージョン攻撃
    var alias015 = UnitCommand.FusionAttack.openCommand;
    UnitCommand.FusionAttack.openCommand = function () {
        alias015.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_FUSIONATTACK);
    };

    // フュージョン(キャッチ)
    var alias016 = UnitCommand.FusionCatch.openCommand;
    UnitCommand.FusionCatch.openCommand = function () {
        alias016.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_FUSIONCATCH);
    };

    // フュージョン(リリース)
    var alias017 = UnitCommand.FusionRelease.openCommand;
    UnitCommand.FusionRelease.openCommand = function () {
        alias017.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_FUSIONRELEASE);
    };

    // フュージョン(トレード)
    var alias018 = UnitCommand.FusionUnitTrade.openCommand;
    UnitCommand.FusionUnitTrade.openCommand = function () {
        alias018.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_FUSIONTRADE);
    };

    // 行動回復
    var alias019 = UnitCommand.Quick.openCommand;
    UnitCommand.Quick.openCommand = function () {
        alias019.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_QUICK);
    };

    // 場所イベント(カスタム)
    var alias020 = UnitCommand.PlaceCommand.openCommand;
    UnitCommand.PlaceCommand.openCommand = function () {
        alias020.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_PLACECOMMAND);
        RewindTimeManager.setPlaceCommandName(this.getCommandName());
    };

    // 会話
    var alias021 = UnitCommand.Talk.openCommand;
    UnitCommand.Talk.openCommand = function () {
        alias021.call(this);

        RewindTimeManager.setCurRecordType(RecordType.UNIT_TALK);
        RewindTimeManager.setTalkCommandName(this.getCommandName());
    };

    /*-----------------------------------------------------------------------------------------------------------------
        再移動時にレコードの種類が待機で上書きされてしまうのを防ぐ処理
    *----------------------------------------------------------------------------------------------------------------*/
    RepeatMoveFlowEntry.isRepeatMoveMode = function () {
        RewindTimeManager.setIsRepeatMoveMode(true);
        return true;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        自軍ユニットの行動終了時にレコード追加のフラグを立てる
    *----------------------------------------------------------------------------------------------------------------*/
    MapSequenceCommand._moveCommand = function () {
        var result, switchTable, index;

        if (this._unitCommandManager.moveListCommandManager() !== MoveResult.CONTINUE) {
            result = this._doLastAction();
            if (result === 0) {
                // 行動終了時(ユニット生存)
                this._straightFlow.enterStraightFlow();
                this.changeCycleMode(MapSequenceCommandMode.FLOW);
            } else if (result === 1) {
                // 行動終了時(ユニット死亡)
                switchTable = root.getMetaSession().getGlobalSwitchTable();
                index = switchTable.getSwitchIndexFromId(APPEND_RECORD_SWITCH_ID);
                switchTable.setSwitch(index, true);
                RewindTimeManager.setCurActionUnit(this._targetUnit);

                return MapSequenceCommandResult.COMPLETE;
            } else {
                // 行動キャンセル時
                this._targetUnit.setMostResentMov(0);
                return MapSequenceCommandResult.CANCEL;
            }
        }

        return MapSequenceCommandResult.NONE;
    };

    MapSequenceCommand._moveFlow = function () {
        var switchTable, index;

        if (this._straightFlow.moveStraightFlow() !== MoveResult.CONTINUE) {
            // 再移動とオートターンエンドが有効な場合に、範囲が残ってしまうのを防ぐ
            this._parentTurnObject.clearPanelRange();

            switchTable = root.getMetaSession().getGlobalSwitchTable();
            index = switchTable.getSwitchIndexFromId(APPEND_RECORD_SWITCH_ID);
            switchTable.setSwitch(index, true);
            RewindTimeManager.setCurActionUnit(this._targetUnit);

            return MapSequenceCommandResult.COMPLETE;
        }

        return MapSequenceCommandResult.NONE;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        マップコマンド「時戻し」の実装
    *----------------------------------------------------------------------------------------------------------------*/
    MapCommand.RewindTime = defineObject(BaseListCommand, {
        _rewindTimeScreen: null,

        openCommand: function () {
            var screenParam = this._createScreenParam();
            this._rewindTimeScreen = createObject(RewindTimeScreen);
            SceneManager.addScreen(this._rewindTimeScreen, screenParam);
        },

        moveCommand: function () {
            if (SceneManager.isScreenClosed(this._rewindTimeScreen)) {
                return MoveResult.END;
            }

            return MoveResult.CONTINUE;
        },

        _createScreenParam: function () {
            var screenParam = ScreenBuilder.buildRewindTime();

            screenParam.recordTitleArray = RewindTimeManager.getRecordTitleArray();
            screenParam.isGameOverRewind = false;

            return screenParam;
        },

        isCommandDisplayable: function () {
            var switchTable = root.getMetaSession().getGlobalSwitchTable();
            var index = switchTable.getSwitchIndexFromId(IS_REWIND_COMMAND_DISPLAYABLE_SWITCH_ID);

            if (switchTable.isSwitchOn(index)) {
                return true;
            }

            return false;
        },

        isSelectable: function () {
            return RewindTimeManager.canRewind();
        },

        getCommandName: function () {
            return REWIND_COMMAND_NAME;
        }
    });

    ScreenBuilder.buildRewindTime = function () {
        return {
            recordTitleArray: null,
            isGameOverRewind: false
        };
    };

    /*-----------------------------------------------------------------------------------------------------------------
        マップコマンドを追加する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias0000 = MapCommand.configureCommands;
    MapCommand.configureCommands = function (groupArray) {
        alias0000.call(this, groupArray);

        groupArray.insertObject(MapCommand.RewindTime, REWIND_COMMAND_INDEX);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        巻き戻しを実行したらマップコマンドを閉じるようにする
    *----------------------------------------------------------------------------------------------------------------*/
    MapCommand._moveTitle = function () {
        var object;
        var result = MoveResult.CONTINUE;

        if (InputControl.isSelectAction()) {
            object = this._commandScrollbar.getObject();
            if (object === null) {
                return result;
            }

            if (typeof object.isSelectable === "function" && !object.isSelectable()) {
                this._playOperationBlockSound();

                return result;
            }

            object.openCommand();

            this._playCommandSelectSound();
            this.changeCycleMode(ListCommandManagerMode.OPEN);
        } else if (InputControl.isCancelAction()) {
            this._playCommandCancelSound();
            this._checkTracingScroll();
            result = MoveResult.END;
        } else if (RewindTimeManager.isRewinded()) {
            RewindTimeManager.setRewinded(false);
            result = MoveResult.END;
        } else {
            this._commandScrollbar.moveScrollbarCursor();
        }

        return result;
    };

    MapCommand._drawTitle = function () {
        var x, y;

        if (RewindTimeManager.isRewinded()) {
            return;
        }

        x = this.getPositionX();
        y = this.getPositionY();

        this._commandScrollbar.drawScrollbar(x, y);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        時戻しコマンドの非活性化に対応するため、Scrollbarオブジェクトを新たに作る
    *----------------------------------------------------------------------------------------------------------------*/
    MapCommand.openListCommandManager = function () {
        this._commandScrollbar = createScrollbarObject(MapCommandScrollbar, this);
        this._commandScrollbar.setActive(true);
        this.rebuildCommand();
        this._playCommandOpenSound();
        this.changeCycleMode(ListCommandManagerMode.TITLE);
    };

    MapCommand._playOperationBlockSound = function () {
        MediaControl.soundDirect("operationblock");
    };

    var MapCommandScrollbar = defineObject(ListCommandScrollbar, {
        drawScrollContent: function (x, y, object, isSelect, index) {
            var textui = this.getParentInstance().getCommandTextUI();
            var color = textui.getColor();
            var font = textui.getFont();
            var pic = textui.getUIImage();

            if (typeof object.isSelectable === "function" && !object.isSelectable()) {
                color = ColorValue.DISABLE;
            }

            TextRenderer.drawFixedTitleText(x, y - 10, object.getCommandName(), color, font, TextFormat.CENTER, pic, this._getPartsCount());
        }
    });

    /*-----------------------------------------------------------------------------------------------------------------
        自軍フェイズでゲームオーバーの条件を満たしたとき、自動で時戻し画面を開く
    *----------------------------------------------------------------------------------------------------------------*/
    PlayerTurnMode.GAMEOVERREWIND = 6;

    PlayerTurn._rewindTimeScreen = null;

    PlayerTurn.moveTurnCycle = function () {
        var mode = this.getCycleMode();
        var result = MoveResult.CONTINUE;

        if (this._checkAutoTurnEnd()) {
            return MoveResult.CONTINUE;
        }

        if (RewindTimeManager.isOtherPhazeRewinded()) {
            this.changeCycleMode(PlayerTurnMode.MAP);
            mode = PlayerTurnMode.MAP;
            RewindTimeManager.setOtherPhazeRewinded(false);
        }

        if (mode === PlayerTurnMode.AUTOCURSOR) {
            result = this._moveAutoCursor();
        } else if (mode === PlayerTurnMode.AUTOEVENTCHECK) {
            result = this._moveAutoEventCheck();
        } else if (mode === PlayerTurnMode.MAP) {
            result = this._moveMap();
        } else if (mode === PlayerTurnMode.AREA) {
            result = this._moveArea();
        } else if (mode === PlayerTurnMode.MAPCOMMAND) {
            result = this._moveMapCommand();
        } else if (mode === PlayerTurnMode.UNITCOMMAND) {
            result = this._moveUnitCommand();
        } else if (mode === PlayerTurnMode.GAMEOVERREWIND) {
            result = this._moveGameOverRewind();
        }

        if (this._checkAutoTurnEnd()) {
            return MoveResult.CONTINUE;
        }

        return result;
    };

    PlayerTurn.drawTurnCycle = function () {
        var mode = this.getCycleMode();

        if (mode === PlayerTurnMode.AUTOCURSOR) {
            this._drawAutoCursor();
        } else if (mode === PlayerTurnMode.AUTOEVENTCHECK) {
            this._drawAutoEventCheck();
        } else if (mode === PlayerTurnMode.MAP) {
            this._drawMap();
        } else if (mode === PlayerTurnMode.AREA) {
            this._drawArea();
        } else if (mode === PlayerTurnMode.MAPCOMMAND) {
            this._drawMapCommand();
        } else if (mode === PlayerTurnMode.UNITCOMMAND) {
            this._drawUnitCommand();
        } else if (mode === PlayerTurnMode.GAMEOVERREWIND) {
            this._drawGameOverRewind();
        }
    };

    PlayerTurn._moveGameOverRewind = function () {
        if (SceneManager.isScreenClosed(this._rewindTimeScreen)) {
            if (GameOverChecker.isGameOver()) {
                GameOverChecker.startGameOver();
            }

            this.changeCycleMode(PlayerTurnMode.MAP);
        }

        return MoveResult.CONTINUE;
    };

    PlayerTurn._drawGameOverRewind = function () {
        MapLayer.drawUnitLayer();
    };

    PlayerTurn._moveAutoEventCheck = function () {
        if (this._eventChecker.moveEventChecker() !== MoveResult.CONTINUE) {
            this._doEventEndAction();
            MapLayer.getMarkingPanel().updateMarkingPanel();
        }

        return MoveResult.CONTINUE;
    };

    PlayerTurn._changeEventMode = function () {
        var result;

        result = this._eventChecker.enterEventChecker(root.getCurrentSession().getAutoEventList(), EventType.AUTO);
        if (result === EnterResult.NOTENTER) {
            this._doEventEndAction();
        } else {
            this.changeCycleMode(PlayerTurnMode.AUTOEVENTCHECK);
        }
    };

    PlayerTurn._doEventEndAction = function () {
        if (GameOverChecker.isGameOver()) {
            if (RewindTimeManager.canRewind()) {
                this._addRewindTimeScreen();
                this.changeCycleMode(PlayerTurnMode.GAMEOVERREWIND);

                return;
            } else {
                GameOverChecker.startGameOver();
            }
        } else {
            RetryControl.register();
        }

        this.changeCycleMode(PlayerTurnMode.MAP);
    };

    PlayerTurn._addRewindTimeScreen = function () {
        var screenParam = this._createRewindTimeScreenParam();

        this._rewindTimeScreen = createObject(RewindTimeScreen);
        SceneManager.addScreen(this._rewindTimeScreen, screenParam);
    };

    PlayerTurn._createRewindTimeScreenParam = function () {
        var screenParam = ScreenBuilder.buildRewindTime();

        screenParam.recordTitleArray = RewindTimeManager.getRecordTitleArray();
        screenParam.isGameOverRewind = true;

        return screenParam;
    };

    var alias015 = GameOverChecker.isGameOver;
    GameOverChecker.isGameOver = function () {
        var isGameOver = alias015.call(this);
        var switchTable = root.getMetaSession().getGlobalSwitchTable();
        var index = switchTable.getSwitchIndexFromId(IS_GAME_OVER_SWITCH_ID);

        if (switchTable.isSwitchOn(index)) {
            isGameOver = true;
        }

        return isGameOver;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        自軍フェイズ以外でゲームオーバーの条件を満たしたとき、自動で時戻し画面を開く
    *----------------------------------------------------------------------------------------------------------------*/
    EnemyTurnMode.GAMEOVERREWIND = 7;

    EnemyTurn._rewindTimeScreen = null;

    EnemyTurn.moveTurnCycle = function () {
        var mode = this.getCycleMode();
        var result = MoveResult.CONTINUE;

        // スキップの確認は、_isSkipAllowedがtrueを返した場合にしている。
        // これにより、戦闘時でのスキップがターンへのスキップまで影響しないようになる。
        if (this._isSkipAllowed() && InputControl.isStartAction()) {
            CurrentMap.setTurnSkipMode(true);
        }

        if (mode === EnemyTurnMode.TOP) {
            result = this._moveTop();
        } else if (mode === EnemyTurnMode.AUTOACTION) {
            result = this._moveAutoAction();
        } else if (mode === EnemyTurnMode.PREACTION) {
            result = this._movePreAction();
        } else if (mode === EnemyTurnMode.AUTOEVENTCHECK) {
            result = this._moveAutoEventCheck();
        } else if (mode === EnemyTurnMode.END) {
            result = this._moveEndEnemyTurn();
        } else if (mode === EnemyTurnMode.IDLE) {
            result = this._moveIdle();
        } else if (mode === EnemyTurnMode.GAMEOVERREWIND) {
            result = this._moveGameOverRewind();
        }

        return result;
    };

    EnemyTurn._moveTop = function () {
        var result, turnType;

        for (;;) {
            // イベントが発生しているため、モード変更
            if (this._eventChecker.enterEventChecker(root.getCurrentSession().getAutoEventList(), EventType.AUTO) === EnterResult.OK) {
                this.changeCycleMode(EnemyTurnMode.AUTOEVENTCHECK);
                return MoveResult.CONTINUE;
            }

            if (GameOverChecker.isGameOver()) {
                if (RewindTimeManager.canRewind()) {
                    turnType = root.getCurrentSession().getTurnType();

                    if (turnType === TurnType.ENEMY) {
                        RewindTimeManager.appendRecord(RecordType.PROGRESS_ENEMYPHASE);
                    } else {
                        RewindTimeManager.appendRecord(RecordType.PROGRESS_ALLYPHASE);
                    }

                    this._addRewindTimeScreen();
                    this.changeCycleMode(EnemyTurnMode.GAMEOVERREWIND);
                    return MoveResult.CONTINUE;
                }

                GameOverChecker.startGameOver();
            }

            // イベントの実行で、シーン自体が変更された場合は続行しない。
            // たとえば、ゲームオーバーになった場合など。
            if (root.getCurrentScene() !== SceneType.FREE) {
                return MoveResult.CONTINUE;
            }

            // 動作するべきユニットを取得
            this._orderUnit = this._checkNextOrderUnit();
            if (this._orderUnit === null) {
                // 敵がこれ以上存在しないため、ターンの終了に入る
                this.changeCycleMode(EnemyTurnMode.END);
                break;
            } else {
                // イベントで\actの制御文字を参照できるようにする
                root.getCurrentSession().setActiveEventUnit(this._orderUnit);

                this._straightFlow.resetStraightFlow();

                // PreActionのフローを実行する。
                // PreActionは、ユニットが移動や攻撃などを行う前の段階の行動であり、
                // ActivePatternFlowEntryなどがある。
                result = this._straightFlow.enterStraightFlow();
                if (result === EnterResult.NOTENTER) {
                    if (this._startAutoAction()) {
                        // グラフィカルに行動を開始するのでモード変更
                        this.changeCycleMode(EnemyTurnMode.AUTOACTION);
                        break;
                    }

                    // このメソッドがfalseを返した場合は、ループすることを意味するから、直ちに次のユニットが確認される。
                    // ユニットが多い場合は、ループしている時間が長くなり、ビジー状態が発生する。
                    if (this._isSkipProgressDisplayable()) {
                        this.changeCycleMode(EnemyTurnMode.TOP);
                        break;
                    }
                } else {
                    // PreActionが存在するのでモード変更
                    this.changeCycleMode(EnemyTurnMode.PREACTION);
                    break;
                }
            }
        }

        return MoveResult.CONTINUE;
    };

    EnemyTurn._moveGameOverRewind = function () {
        if (SceneManager.isScreenClosed(this._rewindTimeScreen)) {
            if (GameOverChecker.isGameOver()) {
                GameOverChecker.startGameOver();
            }

            return MoveResult.END;
        }

        return MoveResult.CONTINUE;
    };

    EnemyTurn._addRewindTimeScreen = function () {
        var screenParam = this._createRewindTimeScreenParam();

        this._rewindTimeScreen = createObject(RewindTimeScreen);
        SceneManager.addScreen(this._rewindTimeScreen, screenParam);
    };

    EnemyTurn._createRewindTimeScreenParam = function () {
        var screenParam = ScreenBuilder.buildRewindTime();

        screenParam.recordTitleArray = RewindTimeManager.getRecordTitleArray();
        screenParam.isGameOverRewind = true;

        return screenParam;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        時戻し画面の実装
    *----------------------------------------------------------------------------------------------------------------*/
    var RewindTimeMode = {
        REWINDSELECT: 0,
        REWINDQUESTION: 1,
        CANCELQUESTION: 2
    };

    var RewindSelectResult = {
        SELECT: 0,
        CANCEL: 1,
        NONE: 2
    };

    var RewindTimeScreen = defineObject(BaseScreen, {
        _rewindTitleWindow: null,
        _rewindCountWindow: null,
        _rewindQuestionWindow: null,
        _cancelQuestionWindow: null,
        _mediaManager: null,
        _isGameOverRewind: false,
        _prevMusicVolume: 0,

        setScreenData: function (screenParam) {
            this._prepareScreenMemberData(screenParam);
            this._completeScreenMemberData(screenParam);
        },

        _prepareScreenMemberData: function (screenParam) {
            this._rewindTitleWindow = createWindowObject(RewindTitleWindow, this);
            this._rewindCountWindow = createWindowObject(RewindCountWindow, this);
            this._rewindQuestionWindow = createWindowObject(QuestionWindow, this);
            this._cancelQuestionWindow = createWindowObject(AltQuestionWindow, this);
            this._mediaManager = root.getMediaManager();
        },

        _completeScreenMemberData: function (screenParam) {
            var commandList = StructureBuilder.buildDataList();
            var recordTitleArray = screenParam.recordTitleArray;

            commandList.setDataArray(recordTitleArray);
            this._rewindTitleWindow.setWindowData(commandList, screenParam.isGameOverRewind);
            this._rewindCountWindow.setWindowData(RewindTimeManager.getRemainRewindCount());
            this._rewindQuestionWindow.setQuestionMessage(REWIND_EXEC_QUESTION_MESSAGE);
            this._cancelQuestionWindow.setQuestionMessage(REWIND_CANCEL_QUESTION_MESSAGE);
            this._isGameOverRewind = screenParam.isGameOverRewind;
            this._prevMusicVolume = this._mediaManager.getMusicVolume();

            if (this._isGameOverRewind) {
                this._mediaManager.setMusicVolume(0);
            } else {
                this._mediaManager.setMusicVolume(Math.floor(this._prevMusicVolume * MUSIC_VOLUME_RATIO));
            }

            this.changeCycleMode(RewindTimeMode.REWINDSELECT);
        },

        moveScreenCycle: function () {
            var mode = this.getCycleMode();
            var result = MoveResult.CONTINUE;

            if (mode === RewindTimeMode.REWINDSELECT) {
                result = this._moveRewindSelect();
            } else if (mode === RewindTimeMode.REWINDQUESTION) {
                result = this._moveRewindQuestion();
            } else if (mode === RewindTimeMode.CANCELQUESTION) {
                result = this._moveCancelQuestion();
            }

            return result;
        },

        _moveRewindSelect: function () {
            var index;
            var result = this._rewindTitleWindow.moveWindow();

            if (this._rewindTitleWindow.isIndexChanged()) {
                // 巻き戻し先の状態を画面に反映
                index = this._rewindTitleWindow.getIndex();
                RewindTimeManager.rewind(true, index);
                MapLayer.getMarkingPanel().updateMarkingPanel();
            }

            if (result === RewindSelectResult.SELECT) {
                this.changeCycleMode(RewindTimeMode.REWINDQUESTION);
            } else if (result === RewindSelectResult.CANCEL) {
                if (this._isGameOverRewind) {
                    this.changeCycleMode(RewindTimeMode.CANCELQUESTION);
                } else {
                    RewindTimeManager.rewindLatest(true);
                    MapLayer.getMarkingPanel().updateMarkingPanel();
                    this._mediaManager.setMusicVolume(this._prevMusicVolume);

                    return MoveResult.END;
                }
            }

            return MoveResult.CONTINUE;
        },

        _moveRewindQuestion: function () {
            var turnType, index, switchTable, switchIndex;
            var result = this._rewindQuestionWindow.moveWindow();

            if (result !== MoveResult.CONTINUE) {
                if (this._rewindQuestionWindow.getQuestionAnswer() === QuestionAnswer.YES) {
                    turnType = root.getCurrentSession().getTurnType();

                    if (turnType !== TurnType.PLAYER) {
                        RewindTimeManager.setOtherPhazeRewinded(true);
                    }

                    index = this._rewindTitleWindow.getIndex();
                    RewindTimeManager.rewind(false, index);
                    RewindTimeManager.decrementRemainRewindCount();
                    this._mediaManager.setMusicVolume(this._prevMusicVolume);

                    if (this._isGameOverRewind) {
                        switchTable = root.getMetaSession().getGlobalSwitchTable();
                        switchIndex = switchTable.getSwitchIndexFromId(IS_GAME_OVER_SWITCH_ID);
                        switchTable.setSwitch(switchIndex, false);
                    } else {
                        // マップコマンドからの巻き戻し後はマップコマンド画面をすぐに閉じる
                        RewindTimeManager.setRewinded(true);
                    }

                    return MoveResult.END;
                } else {
                    this.changeCycleMode(RewindTimeMode.REWINDSELECT);
                }
            }

            return MoveResult.CONTINUE;
        },

        _moveCancelQuestion: function () {
            var result = this._cancelQuestionWindow.moveWindow();

            if (result !== MoveResult.CONTINUE) {
                if (this._cancelQuestionWindow.getQuestionAnswer() === QuestionAnswer.YES) {
                    RewindTimeManager.rewindLatest(true);
                    MapLayer.getMarkingPanel().updateMarkingPanel();
                    this._mediaManager.setMusicVolume(this._prevMusicVolume);

                    return MoveResult.END;
                } else {
                    this.changeCycleMode(RewindTimeMode.REWINDSELECT);
                }
            }

            return MoveResult.CONTINUE;
        },

        drawScreenCycle: function () {
            var x = LayoutControl.getCenterX(-1, this._rewindQuestionWindow.getWindowWidth());
            var y = LayoutControl.getCenterY(-1, this._rewindQuestionWindow.getWindowHeight());

            this._rewindTitleWindow.drawWindow(REWIND_TITLE_WINDOW_X, REWIND_TITLE_WINDOW_Y);
            this._rewindCountWindow.drawWindow(REWIND_COUNT_WINDOW_X, REWIND_COUNT_WINDOW_Y);

            if (this.getCycleMode() === RewindTimeMode.REWINDQUESTION) {
                this._rewindQuestionWindow.drawWindow(x, y);
            } else if (this.getCycleMode() === RewindTimeMode.CANCELQUESTION) {
                this._cancelQuestionWindow.drawWindow(x, y);
            }
        },

        getScreenInteropData: function () {
            return null;
        },

        drawScreenBottomText: function (textui) {},

        getScreenTitleName: function () {
            return "";
        }
    });

    var RewindTitleWindow = defineObject(BaseWindow, {
        _scrollbar: null,
        _graphicManager: null,
        _isGameOverRewind: false,

        setWindowData: function (commandList, isGameOverRewind) {
            var count = commandList.getCount();
            var raw = Math.min(REWIND_TITLE_RAW_LIMIT, count);

            this._scrollbar = createScrollbarObject(RecordTitleScrollbar, this);
            this._scrollbar.setScrollFormation(1, raw);
            this._scrollbar.setIndex(count - 1);
            this._scrollbar.setDataList(commandList);
            this._scrollbar.calculateObjectWidth();
            this._scrollbar.setIsGameOverRewind(isGameOverRewind);
            this._scrollbar.setActive(true);
            this._scrollbar.setScrollYValue(Math.max(0, count - raw));
            this._graphicManager = root.getGraphicsManager();
            this._isGameOverRewind = isGameOverRewind;
        },

        moveWindowContent: function () {
            this._scrollbar.enableSelectCursor(true);
            var input = this._scrollbar.moveInput();

            if (input === ScrollbarInput.SELECT) {
                if (this._isGameOverRewind && this.isLastIndex()) {
                    return RewindSelectResult.NONE;
                }

                return RewindSelectResult.SELECT;
            } else if (input === ScrollbarInput.CANCEL) {
                return RewindSelectResult.CANCEL;
            }

            return RewindSelectResult.NONE;
        },

        drawWindowContent: function (x, y) {
            this._scrollbar.drawScrollbar(x, y);
        },

        _drawWindowInternal: function (x, y, width, height) {
            var gameAreaWidth = root.getGameAreaWidth();
            var gameAreaHeight = root.getGameAreaHeight();
            var color = 0x101010;
            var alpha = 100;

            this._graphicManager.fillRange(0, 0, gameAreaWidth, gameAreaHeight, color, alpha);
            this._graphicManager.fillRange(x, y, width, height, color, alpha + 50);
        },

        getIndex: function () {
            return this._scrollbar.getIndex();
        },

        isLastIndex: function () {
            var index = this.getIndex();
            var objectCount = this._scrollbar.getObjectCount();

            return index === objectCount - 1;
        },

        isIndexChanged: function () {
            return this._scrollbar.checkAndUpdateIndex();
        },

        getWindowWidth: function () {
            return this._scrollbar.getScrollbarWidth() + this.getWindowXPadding() * 2;
        },

        getWindowHeight: function () {
            return this._scrollbar.getScrollbarHeight() + this.getWindowYPadding() * 2;
        }
    });

    var RewindCountWindow = defineObject(BaseWindow, {
        _remainRewindCount: -1,

        setWindowData: function (remainRewindCount) {
            this._remainRewindCount = remainRewindCount;
        },

        moveWindowContent: function () {
            return MoveResult.CONTINUE;
        },

        drawWindowContent: function (x, y) {
            var textui = this.getWindowTextUI();
            var color = textui.getColor();
            var font = textui.getFont();

            y -= 3;

            TextRenderer.drawText(x, y, REMAIN_REWIND_COUNT_TEXT, -1, ColorValue.KEYWORD, font);

            x += 80;
            y -= 5;

            if (this._remainRewindCount < 0) {
                TextRenderer.drawText(x, y + 5, REMAIN_COUNT_LIMITLESS, -1, ColorValue.DEFAULT, font);
            } else {
                NumberRenderer.drawNumber(x, y, this._remainRewindCount);
            }
        },

        getWindowWidth: function () {
            return 130;
        },

        getWindowHeight: function () {
            return 40;
        },

        getWindowTextUI: function () {
            return root.queryTextUI("default_window");
        }
    });

    var RecordTitleScrollbar = defineObject(BaseScrollbar, {
        _isGameOverRewind: false,

        setIsGameOverRewind: function (isGameOverRewind) {
            this._isGameOverRewind = isGameOverRewind;
        },

        moveInput: function () {
            var input, index, count;

            if (root.isInputAction(InputType.BTN1) || this._isScrollbarObjectPressed()) {
                index = this.getIndex();
                count = this.getObjectCount();

                if (this._isGameOverRewind && index === count - 1) {
                    this.playOperationBlockSound();
                } else {
                    this.playSelectSound();
                }

                input = ScrollbarInput.SELECT;
            } else if (InputControl.isCancelAction()) {
                this.playCancelSound();
                input = ScrollbarInput.CANCEL;
            } else if (InputControl.isOptionAction()) {
                this.playOptionSound();
                input = ScrollbarInput.OPTION;
            } else if (InputControl.isStartAction()) {
                this.playStartSound();
                input = ScrollbarInput.START;
            } else {
                this.moveScrollbarCursor();
                input = ScrollbarInput.NONE;
            }

            return input;
        },

        drawScrollContent: function (x, y, object, isSelect, index) {
            var color;
            var count = this.getObjectCount();
            var textui = this.getParentTextUI();
            var font = textui.getFont();

            if (this._isGameOverRewind && index === count - 1) {
                color = ColorValue.DISABLE;
            } else if (object.isTurnStart) {
                color = ColorValue.KEYWORD;
            } else {
                color = ColorValue.DEFAULT;
            }

            TextRenderer.drawKeywordText(x, y, object.getTitle(), -1, color, font);
        },

        drawCursor: function (x, y, isActive) {
            var pic = this.getCursorPicture();

            x -= 6;
            y = y - (32 - this._objectHeight) / 2;

            this._commandCursor.drawCursor(x, y, isActive, pic);
        },

        drawDescriptionLine: function (x, y) {},

        playOperationBlockSound: function () {
            MediaControl.soundDirect("operationblock");
        },

        calculateObjectWidth: function () {
            var i, text;
            var textui = this.getParentTextUI();
            var font = textui.getFont();
            var width = 140;
            var count = this.getObjectCount();

            for (i = 0; i < count; i++) {
                text = this.getObjectFromIndex(i).getTitle();
                width = Math.max(width, TextRenderer.getTextWidth(text, font));
            }

            this._objectWidth = width;
        },

        getObjectWidth: function () {
            return this._objectWidth;
        },

        getObjectHeight: function () {
            return 30;
        }
    });

    var AltQuestionWindow = defineObject(QuestionWindow, {
        _messageArray: null,
        _rowCount: 0,
        _windowHeight: 0,

        setQuestionMessage: function (message) {
            this._messageArray = message.split("\n");
            this._rowCount = this._messageArray.length;

            this._createScrollbar();
            this._calculateWindowSize();
            this.setQuestionIndex(0);
        },

        drawWindowContent: function (x, y) {
            var i;
            var length = this._getTextLength();
            var textui = this.getWindowTextUI();
            var color = textui.getColor();
            var font = textui.getFont();

            y += 10;

            for (i = 0; i < this._rowCount; i++) {
                TextRenderer.drawText(x, y, this._messageArray[i], length, color, font);

                if (i < this._rowCount - 1) {
                    y += font.getSize();
                }
            }

            this._scrollbar.drawScrollbar(x, y);
        },

        _calculateWindowSize: function () {
            var i;
            var textui = this.getWindowTextUI();

            this._windowWidth = 0;
            for (i = 0; i < this._rowCount; i++) {
                this._windowWidth = Math.max(
                    this._windowWidth,
                    TextRenderer.getTextWidth(this._messageArray[0], textui.getFont()) + DefineControl.getWindowXPadding() * 3
                );
            }

            if (this._windowWidth < 250) {
                this._windowWidth = 250;
            } else if (this._windowWidth > 500) {
                this._windowWidth = 500;
            }

            this._windowHeight = TextRenderer.getTextHeight(this._messageArray[0], textui.getFont()) + 135;
        },

        getWindowHeight: function () {
            return this._windowHeight;
        }
    });
})();
