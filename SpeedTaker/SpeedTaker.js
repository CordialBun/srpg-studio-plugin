/*-----------------------------------------------------------------------------------------------------------------

スキル「速さの吸収」 Ver.1.00


【概要】
このスキルを持つユニットは、自分から戦闘を仕掛けて相手ユニットを撃破したときに速さ上昇のバフステートを獲得します。
このバフは上昇量が上限値に達しない限りは上記の条件を満たすたびに効果が累積し、マップが終了するまで継続します。
現在の上昇量はユニットメニュー内のステートアイコンの上に表示される数値で確認できます。

元ネタ準拠でこの名前にしていますが、カスパラの設定を変えることで速さ以外の能力値も対象にできます。
また、他にも以下のような特徴があります。
・1回あたりの上昇値や上限値は任意に変更可能
・自軍、敵軍、同盟軍問わず全所属のユニットがこのスキルを使用可能
・同一ユニットが異なる能力値を対象にした複数の吸収スキルを同時に使用することも可能
・上昇値をマイナスにすればデバフステートとしても使用可能


【使い方】
カスタムスキルとカスタムステートを作成し、以下の設定を行ってください。

[スキル]
キーワードに SpeedTaker を、カスタムパラメータに以下を設定します。
XXには対応するステート(↓で設定するステート)のIDの数値を入力してください。
{
    stateId: XX
}

[ステート]
カスタムパラメータに以下を設定します。
XXには能力値の種類を表す数値を(別項「能力値対応表」を参照)、
YYには累積回数の上限を、ZZには1回あたりの能力値の上昇量を入力してください。
{
    isSpeedTakerState: true,
    paramType: XX,
    countLimit: YY,
    perBonus: ZZ
}

例えば、1回あたり速さ+2で最大+10まで上昇させたい場合は以下のように設定します。

{
    isSpeedTakerState: true,
    paramType: 4,
    countLimit: 5,
    perBonus: 2
}

最後に「バッドステータスとして扱う」のチェックを外します。
（バステ回復の対象から外すため。設定によってはバステ扱いした方が適切な場合もあると思います）

その他の項目は特に変更する必要はありません。


【能力値対応表】
HP      0
力      1
魔力    2
技      3
速さ    4
幸運    5
守備力  6
魔防力  7
移動力  8
熟練度  9
体格    10


【補足】
ユニットメニューのUIを変更するプラグインを導入している場合、
本プラグインのステートアイコン周りの描画機能と競合する可能性があります。

対策としては、以下を実施すると解決できるかも…？

1.本プラグインの222～239行目を全てコメントアウトする。

2.ユニットメニューのUIを変更しているプラグイン内に
GraphicsRenderer.drawImage(x, y, state.getIconResourceHandle(), GraphicsType.ICON);
みたいな行がないか探す。もしあったら、その真下に
SGP_drawCurTakenBonus(x, y, turnState);
と追記する。


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
Ver.1.0  2024/10/15  初版


*----------------------------------------------------------------------------------------------------------------*/

/*-----------------------------------------------------------------------------------------------------------------
    現在の能力値上昇量をステートアイコンの上に描画する
*----------------------------------------------------------------------------------------------------------------*/
SGP_drawCurTakenBonus = function (x, y, turnState) {
    var defeatCount, perBonus;
    var state = turnState.getState();
    var isSpeedTakerState = state.custom.isSpeedTakerState;

    if (typeof isSpeedTakerState !== "boolean" || !isSpeedTakerState) {
        return;
    }

    defeatCount = turnState.custom.defeatCount;
    perBonus = state.custom.perBonus;

    if (typeof defeatCount !== "number" || typeof perBonus !== "number") {
        return;
    }

    NumberRenderer.drawNumber(x, y - 6, defeatCount * perBonus);
};

(function () {
    /*-----------------------------------------------------------------------------------------------------------------
        吸収ステートによる能力値上昇を反映する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias000 = StateControl.getStateParameter;
    StateControl.getStateParameter = function (unit, index) {
        var i, turnState, state, paramType, defeatCount, perBonus;
        var list = unit.getTurnStateList();
        var count = list.getCount();
        var value = alias000.call(this, unit, index);

        for (i = 0; i < count; i++) {
            turnState = list.getData(i);
            state = turnState.getState();
            paramType = state.custom.paramType;

            if (typeof paramType !== "number" || paramType !== index) {
                continue;
            }

            defeatCount = turnState.custom.defeatCount;
            perBonus = state.custom.perBonus;

            if (typeof defeatCount === "number" && typeof perBonus === "number") {
                value += perBonus * defeatCount;
            }
        }

        return value;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        戦闘終了後に吸収ステートの更新を行う
    *----------------------------------------------------------------------------------------------------------------*/
    var alias001 = PreAttack._doEndAction;
    PreAttack._doEndAction = function () {
        alias001.call(this);
        var i, j, skillCount, turnStateCount, isStateExist, turnState, state, stateId, defeatCount, countLimit;
        var skillRefList, unitTurnStateList, baseStateList;
        var active = this.getActiveUnit();
        var passive = this.getPassiveUnit();

        if (passive.getAliveState() === AliveType.ALIVE) {
            return;
        }

        skillRefList = active.getSkillReferenceList();
        skillCount = skillRefList.getTypeCount();
        unitTurnStateList = active.getTurnStateList();
        turnStateCount = unitTurnStateList.getCount();
        baseStateList = root.getBaseData().getStateList();

        for (i = 0; i < skillCount; i++) {
            skill = skillRefList.getTypeData(i);
            stateId = skill.custom.stateId;

            if (skill.getCustomKeyword() !== "SpeedTaker" || typeof stateId !== "number") {
                continue;
            }

            isStateExist = false;

            for (j = 0; j < turnStateCount; j++) {
                turnState = unitTurnStateList.getData(j);
                state = turnState.getState();

                if (state.getId() !== stateId) {
                    continue;
                }

                defeatCount = turnState.custom.defeatCount;
                countLimit = state.custom.countLimit;

                if (typeof defeatCount !== "number") {
                    continue;
                }

                if (typeof countLimit !== "number" || countLimit < 1) {
                    countLimit = Number.MAX_VALUE;
                }

                turnState.custom.defeatCount = Math.min(defeatCount + 1, countLimit);
                isStateExist = true;
                break;
            }

            if (!isStateExist) {
                state = baseStateList.getDataFromId(stateId);
                turnState = StateControl.arrangeState(active, state, IncreaseType.INCREASE);
                turnState.custom.defeatCount = 1;
            }
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ユニットメニューのステートアイコンに補足情報(現在の能力値上昇量)を追加表示する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias002 = UnitSentence.State.drawUnitSentence;
    UnitSentence.State.drawUnitSentence = function (x, y, unit, weapon, totalStatus) {
        alias002.call(this, x, y, unit, weapon, totalStatus);
        var i, turnState;
        var count = this._arr.length;
        var xPrev = x;

        for (i = 0; i < count; i++) {
            turnState = this._arr[i];
            SGP_drawCurTakenBonus(x, y, turnState);
            x += GraphicsFormat.ICON_WIDTH + 22;

            if ((i + 1) % 2 === 0) {
                x = xPrev;
                y += this._unitSentenceWindow.getUnitSentenceSpaceY();
            }
        }
    };
})();
