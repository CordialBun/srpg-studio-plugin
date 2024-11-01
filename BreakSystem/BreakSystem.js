/*-----------------------------------------------------------------------------------------------------------------

ブレイクシステム Ver.1.00


【概要】
戦闘を仕掛けた側のユニットが相性有利武器で攻撃を命中させてダメージを与えたとき、相手ユニットにステート「ブレイク(名前は変更可)」を付与します。
ブレイク状態のユニットは、ステートが付与された戦闘とその次の戦闘が終わるまで反撃が一切できなくなります。
ブレイク状態は所属のフェイズ開始時に自動的に回復します。


【使い方】
ステートを作成し、以下の設定を行ってください。

1.名前、マップアニメ、リアルアニメは任意のものを設定する。
2.封印の「物理攻撃」「魔法攻撃」にチェックを入れる。
3.自動解除条件を「戦闘に入った」「1回目で解除」に設定する。
4.その他の項目はデフォルトのままにしておく。

ステートの設定完了後、本プラグインの46行目の数値を上記のステートのIDに変更してください。


【作者】
さんごぱん(https://twitter.com/CordialBun)

【対応バージョン】
SRPG Studio version:1.302

【利用規約】
・利用はSRPG Studioを使ったゲームに限ります。
・商用、非商用問わず利用可能です。
・改変等、問題ありません。
・再配布OKです。ただしコメント文中に記載されている作者名は消さないでください。
・SRPG Studioの利用規約は遵守してください。

【更新履歴】
Ver.1.0  2024/10/29  初版


*----------------------------------------------------------------------------------------------------------------*/

(function () {
    /*-----------------------------------------------------------------------------------------------------------------
        パラメータ
    *----------------------------------------------------------------------------------------------------------------*/
    var BREAK_STATE_ID = 6; // ブレイク状態のステートのID

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
        var state;
        var active = virtualActive.unitSelf;
        var passive = virtualPassive.unitSelf;
        var weapon = virtualActive.weapon;
        var isPreemptive = virtualActive.isPreemptive;
        var compatible = CompatibleCalculator._getCompatible(active, passive, weapon);

        if (isPreemptive && compatible !== null) {
            state = root.getBaseData().getStateList().getDataFromId(BREAK_STATE_ID);
            attackEntry.stateArrayPassive.push(state);
            virtualPassive.stateArray.push(state);
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
        ブレイク状態は所属フェイズの開始時に回復する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias003 = StateTurnFlowEntry._checkStateTurn;
    StateTurnFlowEntry._checkStateTurn = function () {
        alias003.call(this);
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
})();
