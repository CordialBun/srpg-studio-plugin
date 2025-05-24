/*-----------------------------------------------------------------------------------------------------------------

ブレイクシステム Ver.1.30


【概要】
戦闘を仕掛けた側のユニットが相性有利武器で攻撃を命中させてダメージを与えたとき、相手ユニットにステート「ブレイク(名前は変更可)」を付与します。
ブレイク状態のユニットは、ステートが付与された戦闘とその次の戦闘が終わるまで反撃が一切できなくなります。
ブレイク状態は所属のフェイズ開始時に自動的に回復します。


【使い方】
ステートを作成し、以下の設定を行ってください。

1.名前、マップアニメ、リアルアニメは任意のものを設定する。
2.持続ターンを1に設定する。
3.自動解除条件を「戦闘に入った」「1回目で解除」に設定する。
4.その他の項目はデフォルトのままにしておく。

ステートの設定完了後、本プラグインの設定項目のBREAK_STATE_IDの数値を上記のステートのIDに変更してください。


【敵AIがブレイクできる相手を狙う優先度】
設定項目のBREAK_PRIORITY_RATEを1より大きい数値にすることで、
敵AIがブレイクできる相手を優先的に狙うように設定できます。
数値が大きければ大きいほど優先度が上がりやすくなります。


【ブレイク無効スキル】
ボスユニットや特定の兵種など、ブレイク状態にさせたくないユニットがいる場合は、
カスタムスキルを作成してキーワードに resistBreak を設定することでブレイク状態を無効にするスキルを実装できます。


【ブレイクスキル・ブレイク武器】
特定のスキルを持つユニットや特定の武器でのみブレイクできるようにしたい場合は、
設定項目のIS_SPECIFIED_SKILL_OR_WEAPON_REQUIREDをtrueに変更し、以下の設定を行ってください。

[スキル]
カスタムスキルを作成し、キーワードに break を設定する。

[武器]
武器のカスタムパラメータに以下を設定する。

{
    isBreakWeapon: true
}


【ウェイトターンシステムとの併用】
プラグイン「ウェイトターンシステム」と併用したい場合、設定項目のWAIT_TURN_SYSTEM_COEXISTSをtrueに変更してください。
ウェイトターンシステムにおいては、ブレイク状態のユニットは自身のアタックターン開始時にブレイク状態が解除される仕様になっています。


【作者】
さんごぱん(https://twitter.com/CordialBun)

【対応バージョン】
SRPG Studio version:1.312

【利用規約】
・利用はSRPG Studioを使ったゲームに限ります。
・商用、非商用問わず利用可能です。
・改変等、問題ありません。
・再配布OKです。ただしコメント文中に記載されている作者名は消さないでください。
・SRPG Studioの利用規約は遵守してください。

【更新履歴】
Ver.1.00 2024/10/29 初版
Ver.1.10 2024/11/03 ブレイク状態を無効にするスキルを実装できる機能を追加。
Ver.1.20 2024/11/05 ウェイトターンシステムとの併用に対応。
                    敵AIがブレイクできる相手を優先的に狙うよう設定できる機能を追加。
                    ブレイク状態の仕様を「物理攻撃、魔法攻撃が封印され、武器の装備もできない」から「攻撃ができなくなるが、武器は装備している扱いになる」に変更。
Ver.1.30 2025/05/24 特定のスキルを持つユニットでのみブレイクできるようにする機能を追加。
                    特定の武器でのみブレイクできるようにする機能を追加。


*----------------------------------------------------------------------------------------------------------------*/

(function () {
    /*-----------------------------------------------------------------------------------------------------------------
        設定項目
    *----------------------------------------------------------------------------------------------------------------*/
    // ウェイトターンシステムと併用する場合はtrue、しない場合はfalse
    var WAIT_TURN_SYSTEM_COEXISTS = false;
    // 特定のスキルを持つユニットや特定の武器でのみブレイクできるようにする場合はtrue、
    // 全ユニットがブレイクできるようにする場合はfalse
    var IS_SPECIFIED_SKILL_OR_WEAPON_REQUIRED = false;
    // ブレイク状態のステートのID
    var BREAK_STATE_ID = 6;
    // 敵AIがブレイクできる相手を狙う優先度
    // 1なら通常と同じで、1より大きければ大きいほど優先して狙う
    var BREAK_PRIORITY_RATE = 1.5;
    // 武器の情報ウィンドウに表示する文字列
    var BREAK_WEAPON_SENTENCE_TEXT = "ブレイク";

    /*-----------------------------------------------------------------------------------------------------------------
        戦闘を仕掛けた側のユニットに印をつけておく
    *----------------------------------------------------------------------------------------------------------------*/
    var alias000 = NormalAttackOrderBuilder._isDefaultPriority;
    NormalAttackOrderBuilder._isDefaultPriority = function (virtualActive, virtualPassive) {
        virtualActive.isPreemptive = true;

        return alias000.call(this, virtualActive, virtualPassive);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        相性有利武器での攻撃が命中したときにブレイク状態を付与する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias001 = AttackEvaluator.HitCritical._checkStateAttack;
    AttackEvaluator.HitCritical._checkStateAttack = function (virtualActive, virtualPassive, attackEntry) {
        alias001.call(this, virtualActive, virtualPassive, attackEntry);
        var isBreakWeapon, breakSkill, state;
        var active = virtualActive.unitSelf;
        var passive = virtualPassive.unitSelf;
        var weapon = virtualActive.weapon;
        var isPreemptive = virtualActive.isPreemptive;
        var compatible = CompatibleCalculator._getCompatible(active, passive, weapon);
        var resistSkill = SkillControl.getPossessionCustomSkill(passive, "resistBreak");
        var isApplicable = isPreemptive && compatible !== null && resistSkill === null;

        if (IS_SPECIFIED_SKILL_OR_WEAPON_REQUIRED) {
            isBreakWeapon = typeof weapon.custom.isBreakWeapon === "boolean" && weapon.custom.isBreakWeapon;
            breakSkill = SkillControl.getPossessionCustomSkill(active, "break");
            isApplicable = isApplicable && (isBreakWeapon || breakSkill !== null);
        }

        if (isApplicable) {
            state = root.getBaseData().getStateList().getDataFromId(BREAK_STATE_ID);

            // 既にブレイク状態になっている場合、重ねがけはしない
            if (StateControl.getTurnState(passive, state) === null) {
                attackEntry.stateArrayPassive.push(state);
                virtualPassive.stateArray.push(state);
            }
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ダメージを与えられなかった場合はブレイク状態を付与しない
        guardの判定を考慮し、ActiveActionのevaluate後にチェックする
    *----------------------------------------------------------------------------------------------------------------*/
    var alias002 = AttackEvaluator.ActiveAction.evaluateAttackEntry;
    AttackEvaluator.ActiveAction.evaluateAttackEntry = function (virtualActive, virtualPassive, attackEntry) {
        alias002.call(this, virtualActive, virtualPassive, attackEntry);
        var i, count, stateArray, stateArrayPassive, newStateArray, newStateArrayPassive, state;
        var damagePassive = attackEntry.damagePassive;

        if (damagePassive > 0) {
            return;
        }

        stateArray = virtualPassive.stateArray;
        stateArrayPassive = attackEntry.stateArrayPassive;
        newStateArray = [];
        newStateArrayPassive = [];

        count = stateArray.length;
        for (i = 0; i < count; i++) {
            state = stateArray[i];

            if (state.getId() !== BREAK_STATE_ID) {
                newStateArray.push(state);
            }
        }

        count = stateArrayPassive.length;
        for (i = 0; i < count; i++) {
            state = stateArrayPassive[i];

            if (state.getId() !== BREAK_STATE_ID) {
                newStateArrayPassive.push(state);
            }
        }

        virtualPassive.stateArray = newStateArray;
        attackEntry.stateArrayPassive = newStateArrayPassive;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ブレイク状態のユニットは攻撃できない
    *----------------------------------------------------------------------------------------------------------------*/
    var alias003 = VirtualAttackControl._isAttackStopState;
    VirtualAttackControl._isAttackStopState = function (virtualAttackUnit, state) {
        var isAttackStopState = alias003.call(this, virtualAttackUnit, state);

        if (state === null) {
            return false;
        }

        if (state.getId() === BREAK_STATE_ID) {
            return true;
        }

        return isAttackStopState;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        戦闘予測画面でブレイク状態のユニットの攻撃・命中・必殺を空欄にする
    *----------------------------------------------------------------------------------------------------------------*/
    var alias004 = AttackChecker.getAttackStatusInternal;
    AttackChecker.getAttackStatusInternal = function (unit, weapon, targetUnit) {
        var arr = alias004.call(this, unit, weapon, targetUnit);
        var state = root.getBaseData().getStateList().getDataFromId(BREAK_STATE_ID);

        if (StateControl.getTurnState(unit, state) === null) {
            return arr;
        }

        return [, , ,];
    };

    /*-----------------------------------------------------------------------------------------------------------------
        敵AIはブレイクできる相手を優先して狙う
    *----------------------------------------------------------------------------------------------------------------*/
    var alias005 = AIScorer.Weapon._getTotalScore;
    AIScorer.Weapon._getTotalScore = function (unit, combination) {
        var score = alias005.call(this, unit, combination);
        var targetUnit = combination.targetUnit;
        var weapon = combination.item;
        var compatible = CompatibleCalculator._getCompatible(unit, targetUnit, weapon);
        var skill = SkillControl.getPossessionCustomSkill(targetUnit, "resistBreak");
        var state = root.getBaseData().getStateList().getDataFromId(BREAK_STATE_ID);

        if (compatible !== null && skill === null && StateControl.getTurnState(targetUnit, state) === null) {
            score *= BREAK_PRIORITY_RATE;
        }

        return score;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ブレイク状態は所属フェイズの開始時に回復する
    *----------------------------------------------------------------------------------------------------------------*/
    // ウェイトターンシステムと併用している場合、ステートの更新処理はウェイトターンシステム側で行う
    if (!WAIT_TURN_SYSTEM_COEXISTS) {
        var alias006 = StateTurnFlowEntry._checkStateTurn;
        StateTurnFlowEntry._checkStateTurn = function () {
            alias006.call(this);
            var i, j, unitList, unitCount, unit, turnStateList, turnStateCount, turnState, state;
            var turnType = root.getCurrentSession().getTurnType();

            if (turnType === TurnType.PLAYER) {
                unitList = PlayerList.getSortieList();
            } else if (turnType === TurnType.ENEMY) {
                unitList = EnemyList.getAliveList();
            } else if (turnType === TurnType.ALLY) {
                unitList = AllyList.getAliveList();
            }

            unitCount = unitList.getCount();
            for (i = 0; i < unitCount; i++) {
                unit = unitList.getData(i);
                turnStateList = unit.getTurnStateList();
                turnStateCount = turnStateList.getCount();

                for (j = 0; j < turnStateCount; j++) {
                    turnState = turnStateList.getData(j);
                    state = turnState.getState();

                    if (state.getId() === BREAK_STATE_ID) {
                        StateControl.arrangeState(unit, state, IncreaseType.DECREASE);
                    }
                }
            }
        };
    }

    /*-----------------------------------------------------------------------------------------------------------------
        武器の情報ウィンドウに項目を追加する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias007 = ItemInfoWindow._configureWeapon;
    ItemInfoWindow._configureWeapon = function (groupArray) {
        alias007.call(this, groupArray);

        groupArray.appendObject(ItemSentence.BreakWeapon);
    };

    ItemSentence.BreakWeapon = defineObject(BaseItemSentence, {
        drawItemSentence: function (x, y, item) {
            if (this.getItemSentenceCount(item) === 1) {
                ItemInfoRenderer.drawKeyword(x, y, BREAK_WEAPON_SENTENCE_TEXT);
            }
        },

        getItemSentenceCount: function (item) {
            var isBreakWeapon = typeof item.custom.isBreakWeapon === "boolean" && item.custom.isBreakWeapon;

            if (IS_SPECIFIED_SKILL_OR_WEAPON_REQUIRED && isBreakWeapon) {
                return 1;
            }

            return 0;
        },

        getTextUI: function () {
            return root.queryTextUI("default_window");
        }
    });
})();
