/*-----------------------------------------------------------------------------------------------------------------

スキル「速さの吸収」 Ver.1.01


【概要】
戦闘で敵を撃破するたびに能力値が上昇するスキルを実装するプラグインです。

■ 基本動作
・自分から戦闘を仕掛けて相手ユニットを撃破した際に、指定した能力値が上昇するバフステートを獲得
・効果は上限値まで累積し、マップ終了まで継続
・現在の累積回数はステートアイコン上の数値で確認可能

■ 主な特徴
・対象能力値は自由に設定可能（速さ以外も選択可）
・1回あたりの上昇値と累積上限を個別に設定可能
・全所属（自軍・敵軍・同盟軍）のユニットが使用可能
・異なる能力値を対象とする複数の吸収スキルの同時保有に対応
・上昇値をマイナスにすることでデバフスキルとしても利用可能


【使い方】
以下の手順でカスタムスキルとカスタムステートを設定してください。

■ 手順1：カスタムステートの作成
1. カスタムステートを新規作成
2. カスタムパラメータに以下を設定：

{
    isSpeedTakerState: true,
    paramType: [能力値の種類（下記対応表参照）],
    countLimit: [累積回数の上限],
    perBonus: [1回あたりの上昇値]
}

3.「バッドステータスとして扱う」のチェックを外す（バステ回復の対象外にするため）

■ 手順2：カスタムスキルの作成
1. カスタムスキルを新規作成
2. キーワードに「SpeedTaker」を設定
3. カスタムパラメータに以下を設定：

{
    stateId: [手順1で作成したステートのID]
}


【設定例】
速さを1回あたり+2、最大5回（合計+10）まで上昇させる場合：

■ ステートのカスタムパラメータ
{
    isSpeedTakerState: true,
    paramType: 4,
    countLimit: 5,
    perBonus: 2
}

■ スキルのカスタムパラメータ
{
    stateId: 15  // ステートのIDが15の場合
}


【能力値対応表】
paramTypeに設定する数値：

HP      : 0
力      : 1
魔力    : 2
技      : 3
速さ    : 4
幸運    : 5
守備力  : 6
魔防力  : 7
移動力  : 8
熟練度  : 9
体格    : 10


【注意事項】
■ 他プラグインとの競合について
ユニットメニューのUIを変更するプラグインと併用する場合、ステートアイコンの描画が競合する可能性があります。

■ 競合時の対処法
1. 本プラグインの466～482行目をコメントアウト
2. UIを変更しているプラグイン内で以下の記述を探す：
    GraphicsRenderer.drawImage(x, y, state.getIconResourceHandle(), GraphicsType.ICON);
3. 見つかった場合、その直後に以下を追記：
    SGP_drawCurTakenBonus(x, y, turnState);


【作者】
さんごぱん(https://twitter.com/CordialBun)

【対応バージョン】
SRPG Studio version:1.313

【利用規約】
■ 利用条件
・本プラグインはSRPG Studioを使用したゲーム開発においてのみ利用可能です
・商用・非商用を問わず無償で利用できます
・SRPG Studioの利用規約を遵守してください

■ 許可事項
・改変、カスタマイズは自由に行えます
・他者への再配布も可能です

■ 必須事項
・ソースコード内の著作権表記（作者名：さんごぱん）は削除しないでください
・再配布時は本利用規約を含めてください

■ 任意事項
・ゲームのクレジットへの記載は任意ですが、記載いただけると作者が喜びます

■ 免責事項
・本プラグインの使用により生じた損害について、作者は一切の責任を負いません
・サポートは作者の余力がある範囲で行いますが、対応を保証するものではありません

【更新履歴】
Ver.1.01 (2025/06/04)
[リファクタリング] コードの可読性と保守性を向上
    - alias化している箇所の命名規則を改善
    - _original_プレフィックスを使用した明確な命名に変更
    - JSDocコメントの追加（関数の説明、パラメータの型情報、戻り値）
    - セクション区切りの改善（機能別グループ化）
    - マジックナンバーの定数化
    - 長い関数の分割（単一責任原則の適用）
    - 重複コードの削除（型チェック・アクセサの共通化）
    - パフォーマンス最適化（早期判定とインライン化）

Ver.1.00 (2024/10/15)
[公開] 初版リリース


*----------------------------------------------------------------------------------------------------------------*/

/*=================================================================================================================
    外部API関数
    他のプラグインから呼び出し可能な公開関数
=================================================================================================================*/

/**
 * @function SGP_drawCurTakenBonus
 * @global
 * @description ステートアイコンの上に現在の能力値上昇量を数値で表示する
 * 他のUIプラグインとの競合時に、外部プラグインから呼び出すことを想定した公開API関数
 * @param {number} x - 描画位置のX座標
 * @param {number} y - 描画位置のY座標
 * @param {Object} turnState - ターンステートオブジェクト
 * @returns {void}
 * @see プラグイン説明文の「競合時の対処法」を参照
 */
SGP_drawCurTakenBonus = function (x, y, turnState) {
    var BONUS_TEXT_OFFSET_Y = -6;
    var defeatCount, perBonus;
    var state = turnState.getState();
    var isSpeedTakerState = state && state.custom && state.custom.isSpeedTakerState;

    if (typeof isSpeedTakerState !== "boolean" || !isSpeedTakerState) {
        return;
    }

    defeatCount = turnState && turnState.custom ? turnState.custom.defeatCount : null;
    perBonus = state && state.custom ? state.custom.perBonus : null;

    if (typeof defeatCount !== "number" || typeof perBonus !== "number") {
        return;
    }

    NumberRenderer.drawNumber(x, y + BONUS_TEXT_OFFSET_Y, defeatCount * perBonus);
};

(function () {
    /*=================================================================================================================
        設定項目
    =================================================================================================================*/
    /**
     * @constant {string} SPEED_TAKER_KEYWORD
     * @description 吸収スキルを識別するためのキーワード
     */
    var SPEED_TAKER_KEYWORD = "SpeedTaker";

    /**
     * @constant {number} ICON_SPACING
     * @description ステートアイコン間の水平スペース
     */
    var ICON_SPACING = 22;

    /**
     * @constant {number} ICONS_PER_ROW
     * @description 1行あたりのステートアイコン表示数
     */
    var ICONS_PER_ROW = 2;

    /**
     * @constant {number} MIN_COUNT_LIMIT
     * @description 累積回数の最小制限値
     */
    var MIN_COUNT_LIMIT = 1;

    /**
     * @constant {number} INITIAL_DEFEAT_COUNT
     * @description 初回撃破時の撃破カウント初期値
     */
    var INITIAL_DEFEAT_COUNT = 1;

    /*=================================================================================================================
        ステート効果機能
        吸収ステートによる能力値変化の計算処理
    =================================================================================================================*/

    // 元の関数を保存
    var _original_getStateParameter = StateControl.getStateParameter;

    /**
     * @override
     * @description ユニットのステートによる能力値変化を計算し、吸収スキルによる上昇値を加算する
     * パフォーマンス最適化により早期判定とインライン化を実装
     * @param {Object} unit - 対象ユニット
     * @param {number} index - 能力値のインデックス（0:HP, 1:力, 2:魔力, 3:技, 4:速さ, 5:幸運, 6:守備力, 7:魔防力, 8:移動力, 9:熟練度, 10:体格）
     * @returns {number} ステートによる能力値の変化量（吸収による上昇値を含む）
     */
    StateControl.getStateParameter = function (unit, index) {
        var i, turnState, state, paramType, defeatCount, perBonus;
        var list = unit.getTurnStateList();
        var count = list.getCount();
        var value = _original_getStateParameter.call(this, unit, index);

        for (i = 0; i < count; i++) {
            turnState = list.getData(i);
            state = turnState.getState();

            // 早期判定：SpeedTakerステートでない場合は処理をスキップ
            if (!state || !state.custom || !state.custom.isSpeedTakerState) {
                continue;
            }

            // インライン化：関数呼び出しを削減して直接アクセス
            paramType = state.custom.paramType;
            if (typeof paramType !== "number" || paramType !== index) {
                continue;
            }

            // インライン化：安全なアクセサを直接実装
            defeatCount = turnState.custom ? turnState.custom.defeatCount : null;
            perBonus = state.custom.perBonus;

            // 型チェックを一回に集約
            if (typeof defeatCount === "number" && typeof perBonus === "number") {
                value += perBonus * defeatCount;
            }
        }

        return value;
    };

    /*=================================================================================================================
        ヘルパー関数
        共通処理をまとめた補助関数
    =================================================================================================================*/

    /**
     * @function _getCountLimit
     * @description ステートから累積回数上限を安全に取得する
     * @param {Object} state - 対象のステート
     * @returns {number} 累積回数上限
     */
    function _getCountLimit(state) {
        if (!state || !state.custom) {
            return Number.MAX_VALUE;
        }
        var countLimit = state.custom.countLimit;
        return typeof countLimit === "number" && countLimit >= MIN_COUNT_LIMIT ? countLimit : Number.MAX_VALUE;
    }

    /**
     * @function _getStateId
     * @description スキルからステートIDを安全に取得する
     * @param {Object} skill - 対象のスキル
     * @returns {number|null} ステートID、無効な場合はnull
     */
    function _getStateId(skill) {
        if (!skill || !skill.custom) {
            return null;
        }
        var stateId = skill.custom.stateId;
        return typeof stateId === "number" ? stateId : null;
    }

    /*=================================================================================================================
        ステート管理機能
        戦闘結果に基づく吸収ステートの付与・更新処理
    =================================================================================================================*/

    /**
     * @function _isUnitDefeated
     * @description ユニットが撃破されたかどうかを判定する
     * @param {Object} unit - 判定対象のユニット
     * @returns {boolean} 撃破されている場合はtrue
     */
    function _isUnitDefeated(unit) {
        return unit.getAliveState() !== AliveType.ALIVE;
    }

    /**
     * @function _getSpeedTakerSkills
     * @description ユニットが持つSpeedTakerスキルの一覧を取得する
     * @param {Object} unit - 対象ユニット
     * @returns {Array} SpeedTakerスキルの配列
     */
    function _getSpeedTakerSkills(unit) {
        var skills = [];
        var skillRefList = unit.getSkillReferenceList();
        var skillCount = skillRefList.getTypeCount();
        var i, skill, stateId;

        for (i = 0; i < skillCount; i++) {
            skill = skillRefList.getTypeData(i);
            stateId = _getStateId(skill);

            if (skill.getCustomKeyword() === SPEED_TAKER_KEYWORD && stateId !== null) {
                skills.push({
                    skill: skill,
                    stateId: stateId
                });
            }
        }

        return skills;
    }

    /**
     * @function _findExistingSpeedTakerState
     * @description 指定されたステートIDのSpeedTakerステートを検索する
     * @param {Object} unit - 対象ユニット
     * @param {number} stateId - 検索するステートID
     * @returns {Object|null} 見つかったターンステートオブジェクト、見つからない場合はnull
     */
    function _findExistingSpeedTakerState(unit, stateId) {
        var unitTurnStateList = unit.getTurnStateList();
        var turnStateCount = unitTurnStateList.getCount();
        var j, turnState, state;

        for (j = 0; j < turnStateCount; j++) {
            turnState = unitTurnStateList.getData(j);
            state = turnState.getState();

            if (state.getId() === stateId) {
                return turnState;
            }
        }

        return null;
    }

    /**
     * @function _updateSpeedTakerState
     * @description 既存のSpeedTakerステートの撃破カウントを更新する
     * @param {Object} turnState - 更新対象のターンステート
     * @param {Object} state - ステートオブジェクト
     * @returns {boolean} 更新が成功した場合はtrue
     */
    function _updateSpeedTakerState(turnState, state) {
        // インライン化：直接アクセスでパフォーマンス向上
        var defeatCount = turnState.custom ? turnState.custom.defeatCount : null;
        var countLimit = _getCountLimit(state);

        if (typeof defeatCount !== "number") {
            return false;
        }

        turnState.custom.defeatCount = Math.min(defeatCount + INITIAL_DEFEAT_COUNT, countLimit);
        return true;
    }

    /**
     * @function _createSpeedTakerState
     * @description 新しいSpeedTakerステートを作成する
     * @param {Object} unit - 対象ユニット
     * @param {number} stateId - 作成するステートID
     * @returns {Object|null} 作成されたターンステートオブジェクト、失敗した場合はnull
     */
    function _createSpeedTakerState(unit, stateId) {
        var baseStateList = root.getBaseData().getStateList();
        var state = baseStateList.getDataFromId(stateId);
        var turnState;

        if (!state) {
            return null;
        }

        turnState = StateControl.arrangeState(unit, state, IncreaseType.INCREASE);
        if (turnState) {
            turnState.custom.defeatCount = INITIAL_DEFEAT_COUNT;
        }

        return turnState;
    }

    /**
     * @function _processSpeedTakerSkill
     * @description 単一のSpeedTakerスキルを処理する
     * @param {Object} unit - 対象ユニット
     * @param {Object} skillData - スキルデータ（skill と stateId を含む）
     * @returns {void}
     */
    function _processSpeedTakerSkill(unit, skillData) {
        var existingState = _findExistingSpeedTakerState(unit, skillData.stateId);

        if (existingState) {
            var state = existingState.getState();
            _updateSpeedTakerState(existingState, state);
        } else {
            _createSpeedTakerState(unit, skillData.stateId);
        }
    }

    // 元の関数を保存
    var _original_doEndAction = PreAttack._doEndAction;

    /**
     * @override
     * @description 戦闘終了時に相手を撃破した場合、吸収スキルによるステートを付与または更新する
     * @returns {void}
     */
    PreAttack._doEndAction = function () {
        _original_doEndAction.call(this);

        var active = this.getActiveUnit();
        var passive = this.getPassiveUnit();
        var speedTakerSkills, i;

        // 撃破判定
        if (!_isUnitDefeated(passive)) {
            return;
        }

        // SpeedTakerスキルを取得
        speedTakerSkills = _getSpeedTakerSkills(active);

        // 各SpeedTakerスキルを処理
        for (i = 0; i < speedTakerSkills.length; i++) {
            _processSpeedTakerSkill(active, speedTakerSkills[i]);
        }
    };

    /*=================================================================================================================
        UI表示機能
        ステートアイコンと能力値上昇量の表示処理
    =================================================================================================================*/

    // 元の関数を保存
    var _original_drawUnitSentence = UnitSentence.State.drawUnitSentence;

    /**
     * @override
     * @description ユニットメニューのステートアイコン描画時に、吸収スキルによる能力値上昇量を数値で表示する
     * @param {number} x - 描画開始位置のX座標
     * @param {number} y - 描画開始位置のY座標
     * @param {Object} unit - 対象ユニット
     * @param {Object} weapon - 装備武器
     * @param {Object} totalStatus - 総合ステータス
     * @returns {void}
     */
    UnitSentence.State.drawUnitSentence = function (x, y, unit, weapon, totalStatus) {
        _original_drawUnitSentence.call(this, x, y, unit, weapon, totalStatus);
        var i, turnState;
        var count = this._arr.length;
        var xPrev = x;

        for (i = 0; i < count; i++) {
            turnState = this._arr[i];
            SGP_drawCurTakenBonus(x, y, turnState);
            x += GraphicsFormat.ICON_WIDTH + ICON_SPACING;

            if ((i + 1) % ICONS_PER_ROW === 0) {
                x = xPrev;
                y += this._unitSentenceWindow.getUnitSentenceSpaceY();
            }
        }
    };
})();
