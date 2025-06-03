/*-----------------------------------------------------------------------------------------------------------------

ブレイクシステム Ver.1.31


【概要】
本プラグインは、戦略的な駆け引きを生み出す「ブレイクシステム」を実装します。
戦闘を仕掛けたユニットが相性有利な武器で攻撃を命中させ、ダメージを与えた際に、相手ユニットを「ブレイク状態」にすることができます。

ブレイク状態の効果：
・現在の戦闘および次の戦闘まで、一切の反撃が不可能になります
・所属勢力のフェイズ開始時に自動的に解除されます


【使い方】
ブレイク状態を表すステートを作成し、以下の設定を行ってください：

1. ステートの基本設定
    - 名前：任意（例：「ブレイク」）
    - マップアニメーション：任意
    - リアルアニメーション：任意

2. 動作設定
    - 持続ターン：1
    - 自動解除条件：「戦闘に入った」かつ「1回目で解除」
    - その他の項目：デフォルト値のまま

3. プラグイン設定
    - BREAK_STATE_ID：作成したステートのIDを指定


【カスタマイズ機能】

■ 敵AIの行動優先度設定
BREAK_PRIORITY_RATEの値を調整することで、敵AIがブレイク可能な相手を狙う優先度を設定できます。
・初期値：1（通常の優先度）
・推奨値：1.5～3.0（値が大きいほど優先度が上昇）

■ ブレイク無効化
特定のユニット（ボス等）をブレイク不可にする場合：
1. カスタムスキルを作成
2. キーワードに「resistBreak」を設定
3. 対象ユニットにスキルを付与

■ 限定的なブレイク発動条件
IS_SPECIFIED_SKILL_OR_WEAPON_REQUIREDをtrueにすることで、以下の条件でのみブレイクが発動するようになります：

【スキルによる発動】
・カスタムスキルのキーワードに「break」を設定

【武器による発動】
・武器のカスタムパラメータに以下を設定：
{
    isBreakWeapon: true
}


【他プラグインとの連携】
ウェイトターンシステムとの併用時：
・WAIT_TURN_SYSTEM_COEXISTSをtrueに設定
・ブレイク状態は対象ユニットのアタックターン開始時に解除されます


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
Ver.1.31 (2025/06/05)
[リファクタリング] コードの可読性と保守性を向上
    - 重複コードの削除（ステート取得、配列フィルタリング）
    - 長い関数の分割（単一責任原則の適用）
    - ヘルパー関数の追加（共通処理の抽出）
    - JSDocコメントの追加（型情報と詳細説明）
    - セクション区切りの改善（機能別グループ化）
    - マジックナンバーの定数化

Ver.1.30 (2025/05/24)
[追加] 特定のスキルを持つユニットでのみブレイクできる機能
[追加] 特定の武器でのみブレイクできる機能

Ver.1.20 (2024/11/05)
[追加] ウェイトターンシステムとの併用に対応
[追加] 敵AIがブレイク可能な相手を優先的に狙う設定機能
[変更] ★ブレイク状態の仕様を変更
    - 旧：物理攻撃、魔法攻撃が封印され、武器の装備もできない
    - 新：攻撃ができなくなるが、武器は装備している扱いになる

Ver.1.10 (2024/11/03)
[追加] ブレイク状態を無効にするスキル機能（resistBreakキーワード）

Ver.1.00 (2024/10/29)
[公開] 初版リリース


*----------------------------------------------------------------------------------------------------------------*/

(function () {
    /*=================================================================================================================
        設定項目
    =================================================================================================================*/
    /**
     * @constant {boolean} WAIT_TURN_SYSTEM_COEXISTS
     * @description ウェイトターンシステムとの併用設定
     * true: ウェイトターンシステムと併用する
     * false: ウェイトターンシステムと併用しない
     */
    var WAIT_TURN_SYSTEM_COEXISTS = false;

    /**
     * @constant {boolean} IS_SPECIFIED_SKILL_OR_WEAPON_REQUIRED
     * @description ブレイク発動条件の制限設定
     * true: 特定のスキルを持つユニットや特定の武器でのみブレイク可能
     * false: 全ユニットがブレイク可能
     */
    var IS_SPECIFIED_SKILL_OR_WEAPON_REQUIRED = false;

    /**
     * @constant {number} BREAK_STATE_ID
     * @description ブレイク状態を表すステートのID
     */
    var BREAK_STATE_ID = 6;

    /**
     * @constant {number} BREAK_PRIORITY_RATE
     * @description 敵AIがブレイク可能な相手を狙う優先度の倍率
     * 1.0: 通常の優先度
     * 1.0より大きい値: より優先的に狙う
     */
    var BREAK_PRIORITY_RATE = 1.5;

    /**
     * @constant {string} BREAK_WEAPON_SENTENCE_TEXT
     * @description 武器の情報ウィンドウに表示する文字列
     */
    var BREAK_WEAPON_SENTENCE_TEXT = "ブレイク";

    /**
     * @constant {Array} EMPTY_ATTACK_STATUS
     * @description ブレイク状態時の戦闘予測表示用空配列
     * [攻撃力, 命中率, 必殺率]を空欄にする
     */
    var EMPTY_ATTACK_STATUS = [, , ,];

    /*=================================================================================================================
        ヘルパー関数
        共通処理をまとめた補助関数
    =================================================================================================================*/

    /**
     * @function getBreakState
     * @description ブレイク状態のステートオブジェクトを取得する
     * @returns {Object} ブレイク状態のステートオブジェクト
     */
    function getBreakState() {
        return root.getBaseData().getStateList().getDataFromId(BREAK_STATE_ID);
    }

    /**
     * @function removeBreakStateFromArray
     * @description ステート配列からブレイク状態を除去した新しい配列を作成する
     * @param {Array} stateArray - フィルタリング対象のステート配列
     * @returns {Array} ブレイク状態を除いた新しい配列
     */
    function removeBreakStateFromArray(stateArray) {
        var newArray = [];
        var count = stateArray.length;
        var i, state;

        for (i = 0; i < count; i++) {
            state = stateArray[i];
            if (state.getId() !== BREAK_STATE_ID) {
                newArray.push(state);
            }
        }

        return newArray;
    }

    /**
     * @function _isBreakConditionMet
     * @description ブレイク状態付与の基本条件を満たしているかをチェックする
     * @param {Object} virtualActive - 攻撃側の仮想ユニット
     * @param {Object} virtualPassive - 防御側の仮想ユニット
     * @returns {boolean} 基本条件を満たしている場合はtrue
     */
    function _isBreakConditionMet(virtualActive, virtualPassive) {
        var active = virtualActive.unitSelf;
        var passive = virtualPassive.unitSelf;
        var weapon = virtualActive.weapon;
        var isPreemptive = virtualActive.isPreemptive;
        var compatible = CompatibleCalculator._getCompatible(active, passive, weapon);
        var resistSkill = SkillControl.getPossessionCustomSkill(passive, "resistBreak");

        return isPreemptive && compatible !== null && resistSkill === null;
    }

    /**
     * @function _hasBreakCapability
     * @description ユニットがブレイク能力を持っているかをチェックする
     * @param {Object} active - 攻撃ユニット
     * @param {Object} weapon - 使用武器
     * @returns {boolean} ブレイク能力を持っている場合はtrue
     */
    function _hasBreakCapability(active, weapon) {
        if (!IS_SPECIFIED_SKILL_OR_WEAPON_REQUIRED) {
            return true;
        }

        var isBreakWeapon = weapon && weapon.custom && typeof weapon.custom.isBreakWeapon === "boolean" && weapon.custom.isBreakWeapon;
        var breakSkill = SkillControl.getPossessionCustomSkill(active, "break");

        return isBreakWeapon || breakSkill !== null;
    }

    /**
     * @function _applyBreakStateIfNotExists
     * @description ブレイク状態が未適用の場合のみ、ブレイク状態を付与する
     * @param {Object} passive - 対象ユニット
     * @param {Object} virtualPassive - 防御側の仮想ユニット
     * @param {Object} attackEntry - 攻撃エントリー情報
     * @returns {void}
     */
    function _applyBreakStateIfNotExists(passive, virtualPassive, attackEntry) {
        var state = getBreakState();

        // 既にブレイク状態になっている場合、重ねがけはしない
        if (StateControl.getTurnState(passive, state) === null) {
            attackEntry.stateArrayPassive.push(state);
            virtualPassive.stateArray.push(state);
        }
    }

    /**
     * @function _getUnitListByTurnType
     * @description ターンタイプに基づいて適切なユニットリストを取得する
     * @param {number} turnType - ターンタイプ
     * @returns {Object|null} ユニットリスト、該当なしの場合はnull
     */
    function _getUnitListByTurnType(turnType) {
        if (turnType === TurnType.PLAYER) {
            return PlayerList.getSortieList();
        } else if (turnType === TurnType.ENEMY) {
            return EnemyList.getAliveList();
        } else if (turnType === TurnType.ALLY) {
            return AllyList.getAliveList();
        }
        return null;
    }

    /**
     * @function _removeBreakStateFromUnit
     * @description 指定ユニットからブレイク状態を除去する
     * @param {Object} unit - 対象ユニット
     * @returns {void}
     */
    function _removeBreakStateFromUnit(unit) {
        var turnStateList = unit.getTurnStateList();
        var turnStateCount = turnStateList.getCount();
        var j, turnState, state;

        for (j = 0; j < turnStateCount; j++) {
            turnState = turnStateList.getData(j);
            state = turnState.getState();

            if (state.getId() === BREAK_STATE_ID) {
                StateControl.arrangeState(unit, state, IncreaseType.DECREASE);
            }
        }
    }

    /*=================================================================================================================
        ブレイク状態付与機能
        相性有利武器での攻撃時にブレイク状態を付与し、発動条件を制御する
    =================================================================================================================*/

    /*--- 攻撃側識別 ---*/
    // 元の関数を保存
    var _original_isDefaultPriority = NormalAttackOrderBuilder._isDefaultPriority;

    /**
     * @override
     * @description 戦闘開始時に攻撃側を識別するためのフラグを設定する
     * @param {Object} virtualActive - 攻撃側の仮想ユニット
     * @param {Object} virtualPassive - 防御側の仮想ユニット
     * @returns {boolean} デフォルト優先度の判定結果
     */
    NormalAttackOrderBuilder._isDefaultPriority = function (virtualActive, virtualPassive) {
        virtualActive.isPreemptive = true;

        return _original_isDefaultPriority.call(this, virtualActive, virtualPassive);
    };

    /*--- ブレイク状態付与 ---*/
    // 元の関数を保存
    var _original_checkStateAttack = AttackEvaluator.HitCritical._checkStateAttack;

    /**
     * @override
     * @description 攻撃命中時にブレイク判定を追加し、条件を満たす場合はブレイク状態を付与する
     * @param {Object} virtualActive - 攻撃側の仮想ユニット
     * @param {Object} virtualPassive - 防御側の仮想ユニット
     * @param {Object} attackEntry - 攻撃エントリー情報
     * @returns {void}
     */
    AttackEvaluator.HitCritical._checkStateAttack = function (virtualActive, virtualPassive, attackEntry) {
        _original_checkStateAttack.call(this, virtualActive, virtualPassive, attackEntry);

        // ブレイク条件の基本チェック
        if (!_isBreakConditionMet(virtualActive, virtualPassive)) {
            return;
        }

        // ブレイク能力チェック
        var active = virtualActive.unitSelf;
        var weapon = virtualActive.weapon;
        if (!_hasBreakCapability(active, weapon)) {
            return;
        }

        // ブレイク状態を付与
        var passive = virtualPassive.unitSelf;
        _applyBreakStateIfNotExists(passive, virtualPassive, attackEntry);
    };

    /*--- 発動条件制御 ---*/
    // 元の関数を保存
    var _original_evaluateAttackEntry = AttackEvaluator.ActiveAction.evaluateAttackEntry;

    /**
     * @override
     * @description ダメージが0の場合（ガード等）、ブレイク状態を付与しないようにする
     * @param {Object} virtualActive - 攻撃側の仮想ユニット
     * @param {Object} virtualPassive - 防御側の仮想ユニット
     * @param {Object} attackEntry - 攻撃エントリー情報
     * @returns {void}
     */
    AttackEvaluator.ActiveAction.evaluateAttackEntry = function (virtualActive, virtualPassive, attackEntry) {
        _original_evaluateAttackEntry.call(this, virtualActive, virtualPassive, attackEntry);
        var stateArray, stateArrayPassive, newStateArray, newStateArrayPassive;
        var damagePassive = attackEntry.damagePassive;

        if (damagePassive > 0) {
            return;
        }

        stateArray = virtualPassive.stateArray;
        stateArrayPassive = attackEntry.stateArrayPassive;

        newStateArray = removeBreakStateFromArray(stateArray);
        newStateArrayPassive = removeBreakStateFromArray(stateArrayPassive);

        virtualPassive.stateArray = newStateArray;
        attackEntry.stateArrayPassive = newStateArrayPassive;
    };

    /*=================================================================================================================
        ブレイク状態効果機能
        ブレイク状態のユニットの攻撃制限やUI表示を制御する
    =================================================================================================================*/

    /*--- 攻撃制限 ---*/
    // 元の関数を保存
    var _original_isAttackStopState = VirtualAttackControl._isAttackStopState;

    /**
     * @override
     * @description ブレイク状態のユニットが攻撃できないように制限する
     * @param {Object} virtualAttackUnit - 仮想攻撃ユニット
     * @param {Object} state - チェック対象のステート
     * @returns {boolean} 攻撃が禁止されているかどうか
     */
    VirtualAttackControl._isAttackStopState = function (virtualAttackUnit, state) {
        var isAttackStopState = _original_isAttackStopState.call(this, virtualAttackUnit, state);

        if (state === null) {
            return false;
        }

        if (state.getId() === BREAK_STATE_ID) {
            return true;
        }

        return isAttackStopState;
    };

    /*--- UI表示制御 ---*/
    // 元の関数を保存
    var _original_getAttackStatusInternal = AttackChecker.getAttackStatusInternal;

    /**
     * @override
     * @description ブレイク状態のユニットの戦闘予測表示を空欄にする
     * @param {Object} unit - チェック対象のユニット
     * @param {Object} weapon - 使用する武器
     * @param {Object} targetUnit - 標的ユニット
     * @returns {Array} [攻撃力, 命中率, 必殺率]の配列（ブレイク状態の場合は空配列）
     */
    AttackChecker.getAttackStatusInternal = function (unit, weapon, targetUnit) {
        var arr = _original_getAttackStatusInternal.call(this, unit, weapon, targetUnit);
        var state = getBreakState();

        if (StateControl.getTurnState(unit, state) === null) {
            return arr;
        }

        return EMPTY_ATTACK_STATUS;
    };

    /*=================================================================================================================
        AI・システム連携機能
        敵AIの行動制御やブレイク状態の回復処理を行う
    =================================================================================================================*/

    /*--- AI行動制御 ---*/
    // 元の関数を保存
    var _original_getTotalScore = AIScorer.Weapon._getTotalScore;

    /**
     * @override
     * @description ブレイク可能な相手へのAI評価スコアを上昇させる
     * @param {Object} unit - AIユニット
     * @param {Object} combination - 武器と標的の組み合わせ
     * @returns {number} 総合評価スコア
     */
    AIScorer.Weapon._getTotalScore = function (unit, combination) {
        var score = _original_getTotalScore.call(this, unit, combination);
        var targetUnit = combination.targetUnit;
        var weapon = combination.item;
        var compatible = CompatibleCalculator._getCompatible(unit, targetUnit, weapon);
        var skill = SkillControl.getPossessionCustomSkill(targetUnit, "resistBreak");
        var state = getBreakState();

        if (compatible !== null && skill === null && StateControl.getTurnState(targetUnit, state) === null) {
            score *= BREAK_PRIORITY_RATE;
        }

        return score;
    };

    /*--- 状態回復機能 ---*/
    // ウェイトターンシステムと併用している場合、ステートの更新処理はウェイトターンシステム側で行う
    if (!WAIT_TURN_SYSTEM_COEXISTS) {
        // 元の関数を保存
        var _original_checkStateTurn = StateTurnFlowEntry._checkStateTurn;

        /**
         * @override
         * @description フェイズ開始時にブレイク状態を自動解除する
         * @returns {void}
         */
        StateTurnFlowEntry._checkStateTurn = function () {
            _original_checkStateTurn.call(this);

            var turnType = root.getCurrentSession().getTurnType();
            var unitList = _getUnitListByTurnType(turnType);

            if (!unitList) {
                return;
            }

            var unitCount = unitList.getCount();
            var i, unit;

            for (i = 0; i < unitCount; i++) {
                unit = unitList.getData(i);
                _removeBreakStateFromUnit(unit);
            }
        };
    }

    /*=================================================================================================================
        UI拡張機能
        武器情報ウィンドウにブレイク武器の情報を追加する
    =================================================================================================================*/

    /*--- 武器情報表示 ---*/
    // 元の関数を保存
    var _original_configureWeapon = ItemInfoWindow._configureWeapon;

    /**
     * @override
     * @description ブレイク武器の情報を武器情報ウィンドウに追加する
     * @param {Array} groupArray - 表示項目のグループ配列
     * @returns {void}
     */
    ItemInfoWindow._configureWeapon = function (groupArray) {
        _original_configureWeapon.call(this, groupArray);

        groupArray.appendObject(ItemSentence.BreakWeapon);
    };

    /**
     * @namespace ItemSentence.BreakWeapon
     * @description ブレイク武器の情報を武器情報ウィンドウに表示するためのオブジェクト
     * @extends {BaseItemSentence}
     */
    ItemSentence.BreakWeapon = defineObject(BaseItemSentence, {
        /**
         * @function drawItemSentence
         * @description ブレイク武器のテキストを描画する
         * @param {number} x - 描画位置X座標
         * @param {number} y - 描画位置Y座標
         * @param {Object} item - 武器アイテム
         * @returns {void}
         */
        drawItemSentence: function (x, y, item) {
            if (this.getItemSentenceCount(item) === 1) {
                ItemInfoRenderer.drawKeyword(x, y, BREAK_WEAPON_SENTENCE_TEXT);
            }
        },

        /**
         * @function getItemSentenceCount
         * @description ブレイク武器の情報を表示するかどうかを判定する
         * @param {Object} item - 武器アイテム
         * @returns {number} 表示する場合は1、表示しない場合は0
         */
        getItemSentenceCount: function (item) {
            var isBreakWeapon = typeof item.custom.isBreakWeapon === "boolean" && item.custom.isBreakWeapon;

            if (IS_SPECIFIED_SKILL_OR_WEAPON_REQUIRED && isBreakWeapon) {
                return 1;
            }

            return 0;
        },

        /**
         * @function getTextUI
         * @description テキストUIの設定を取得する
         * @returns {Object} テキストUIオブジェクト
         */
        getTextUI: function () {
            return root.queryTextUI("default_window");
        }
    });
})();
