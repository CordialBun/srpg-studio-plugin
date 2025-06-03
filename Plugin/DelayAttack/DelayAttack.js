/*-----------------------------------------------------------------------------------------------------------------

ディレイアタック Ver.1.00

※注意
本プラグインはウェイトターンシステムの拡張機能です。
ウェイトターンシステムとの併用を前提としており、単体では動作しません。

【概要】
ディレイアタックは、特定の武器を装備中に自分から戦闘を仕掛けて攻撃を命中させたとき、相手ユニットのWT値に一定の値が加算されるシステムです。
これにより、相手ユニットの次の手番を遅らせることができます。

ディレイアタックの効果は攻撃が命中した回数分適用されるので、再攻撃や連続攻撃で複数回攻撃を命中させるとそのぶん効果が倍増します。


【使い方】
下記のURLからマニュアルを参照してください。
https://github.com/CordialBun/srpg-studio-plugin/tree/master/DelayAttack#readme


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
Ver.1.00 2024/11/27 初版


*----------------------------------------------------------------------------------------------------------------*/

/*-----------------------------------------------------------------------------------------------------------------
    設定項目
*----------------------------------------------------------------------------------------------------------------*/
// ディレイタイムを表す文字列
var DELAY_TIME_TEXT = "ＤＴ";
// ディレイ武器の情報ウィンドウに表示する文字列
var DELAY_WEAPON_SENTENCE_TEXT = "ディレイアタック";

(function () {
    /*-----------------------------------------------------------------------------------------------------------------
        攻撃コマンドかどうかのフラグを立てる
    *----------------------------------------------------------------------------------------------------------------*/
    var alias000 = UnitCommand.Attack._prepareCommandMemberData;
    UnitCommand.Attack._prepareCommandMemberData = function () {
        alias000.call(this);

        this._posSelector.setAttack(true);
    };

    PosSelector._isAttack = false;

    PosSelector.isAttack = function () {
        return this._isAttack;
    };

    PosSelector.setAttack = function (isAttack) {
        this._isAttack = isAttack;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        攻撃コマンドで攻撃対象にカーソルを合わせたときにディレイアタックのフラグを立てる
    *----------------------------------------------------------------------------------------------------------------*/
    var alias001 = PosSelector.getSelectorTarget;
    PosSelector.getSelectorTarget = function (isIndexArray) {
        var unit, weapon;
        var targetUnit = alias001.call(this, isIndexArray);

        if (targetUnit === null || !this.isAttack()) {
            return targetUnit;
        }

        unit = this._posMenu.getUnit();
        weapon = ItemControl.getEquippedWeapon(unit);

        if (weapon === null || typeof weapon.custom.delayWT !== "number") {
            return targetUnit;
        }

        targetUnit.custom.delayWT = weapon.custom.delayWT;
        targetUnit.custom.predictDelayAttackCount = Calculator.calculateAttackCount(unit, targetUnit, weapon);
        targetUnit.custom.predictDelayAttackCount *= Calculator.calculateRoundCount(unit, targetUnit, weapon);

        return targetUnit;
    };

    PosMenu.getUnit = function () {
        return this._unit;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        攻撃対象を変更したとき、変更前にカーソルを合わせていたユニットのディレイアタックのフラグを削除する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias002 = PosSelector.setNewTarget;
    PosSelector.setNewTarget = function () {
        var currentTargetUnit = this._posMenu.getCurrentTarget();

        if (currentTargetUnit !== null && typeof currentTargetUnit.custom.delayWT === "number") {
            delete currentTargetUnit.custom.delayWT;
            delete currentTargetUnit.custom.predictDelayAttackCount;
        }

        alias002.call(this);
    };

    PosMenu.getCurrentTarget = function () {
        return this._currentTarget;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        攻撃コマンドをキャンセルしたときにディレイアタックのフラグを削除する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias003 = UnitCommand.Attack.moveCommand;
    UnitCommand.Attack.moveCommand = function () {
        var targetUnit;
        var result = alias003.call(this);
        var mode = this.getCycleMode();

        if (mode === AttackCommandMode.TOP) {
            targetUnit = this._posSelector._posMenu.getCurrentTarget();

            if (targetUnit !== null && typeof targetUnit.custom.delayWT === "number") {
                delete targetUnit.custom.delayWT;
                delete targetUnit.custom.predictDelayAttackCount;
            }
        }

        return result;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        自軍以外のユニットの戦闘時の処理
    *----------------------------------------------------------------------------------------------------------------*/
    var alias004 = WeaponAutoAction.setAutoActionInfo;
    WeaponAutoAction.setAutoActionInfo = function (unit, combination) {
        alias004.call(this, unit, combination);
        var targetUnit = this._targetUnit;
        var weapon = this._weapon;

        if (weapon === null || typeof weapon.custom.delayWT !== "number") {
            return;
        }

        targetUnit.custom.delayWT = weapon.custom.delayWT;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ディレイアタックが命中していたらフラグを立て、命中回数を加算する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias005 = CoreAttack._startCommonAttack;
    CoreAttack._startCommonAttack = function (attackInfo, attackOrder) {
        alias005.call(this, attackInfo, attackOrder);
        var i, attackEntry, targetUnit;
        var count = attackOrder.getEntryCount();
        var attackEntryArray = attackOrder.getAttackEntryArray();

        for (i = 0; i < count; i++) {
            attackEntry = attackEntryArray[i];

            if (attackEntry.isSrc) {
                targetUnit = attackInfo.unitDest;
            } else {
                targetUnit = attackInfo.unitSrc;
            }

            if (typeof targetUnit.custom.delayWT === "number" && attackEntry.isHit) {
                targetUnit.custom.delayAttackHit = true;

                if (typeof targetUnit.custom.delayAttackHitCount === "number") {
                    targetUnit.custom.delayAttackHitCount += 1;
                } else {
                    targetUnit.custom.delayAttackHitCount = 1;
                }
            }
        }
    };

    AttackOrder.getAttackEntryArray = function () {
        return this._attackEntryArray;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        戦闘終了後、ディレイタイムを加算してカスパラを削除する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias006 = PreAttack._doEndAction;
    PreAttack._doEndAction = function () {
        alias006.call(this);
        var active = this.getActiveUnit();
        var passive = this.getPassiveUnit();
        var delayAttackHit = active.custom.delayAttackHit;
        var delayAttackHitCount = active.custom.delayAttackHitCount;
        var delayWT = active.custom.delayWT;

        if (typeof delayAttackHit === "boolean" && delayAttackHit && typeof delayWT === "number" && typeof delayAttackHitCount === "number") {
            active.custom.curWT = Math.max(active.custom.curWT + delayWT * delayAttackHitCount, 0);
            delete active.custom.delayAttackHit;
            delete active.custom.delayAttackHitCount;
            delete active.custom.delayWT;
            delete active.custom.predictDelayAttackCount;
        }

        delayAttackHit = passive.custom.delayAttackHit;
        delayAttackHitCount = passive.custom.delayAttackHitCount;
        delayWT = passive.custom.delayWT;

        if (typeof delayAttackHit === "boolean" && delayAttackHit && typeof delayWT === "number" && typeof delayAttackHitCount === "number") {
            passive.custom.curWT = Math.max(passive.custom.curWT + delayWT * delayAttackHitCount, 0);
            delete passive.custom.delayAttackHit;
            delete passive.custom.delayAttackHitCount;
            delete passive.custom.delayWT;
            delete passive.custom.predictDelayAttackCount;
        }
    };
})();
