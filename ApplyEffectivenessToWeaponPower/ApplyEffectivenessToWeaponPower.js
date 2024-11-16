/*-----------------------------------------------------------------------------------------------------------------

特効係数を攻撃力ではなく武器の威力に適用する Ver.1.00


【概要】
SRPG Studioでは特効係数は攻撃力に適用されるのがデフォルトの仕様になっていますが、これを武器の威力に適用されるよう変更します。
つまり、攻撃力の計算式を
(力or魔力+武器の威力+武器相性補正+支援効果)×特効係数
から
力or魔力+(武器の威力+武器相性補正)×特効係数+支援効果
に変更します。


【使い方】
本プラグインをプロジェクトのPluginフォルダ配下に保存してください。

スキル「特効耐性」のプラグインと併用する場合、設定項目のVARY_EFFECTIVE_FACTOR_SKILL_COEXISTをtrueに変更してください。


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
Ver.1.00 2024/11/16 初版


*----------------------------------------------------------------------------------------------------------------*/

(function () {
    /*-----------------------------------------------------------------------------------------------------------------
        設定項目
    *----------------------------------------------------------------------------------------------------------------*/
    // スキル「特効耐性」と併用する場合はtrue、しない場合はfalse
    var VARY_EFFECTIVE_FACTOR_SKILL_COEXIST = false;

    // 設定項目はここまで

    DamageCalculator.calculateAttackPower = function (active, passive, weapon, isCritical, totalStatus, trueHitValue) {
        var pow;
        var weaponPow = weapon.getPow() + CompatibleCalculator.getPower(active, passive, weapon);
        var supportPow = SupportCalculator.getPower(totalStatus);

        if (Miscellaneous.isPhysicsBattle(weapon)) {
            // 物理攻撃または投射攻撃
            pow = RealBonus.getStr(active);
        } else {
            // 魔法攻撃
            pow = RealBonus.getMag(active);
        }

        if (this.isEffective(active, passive, weapon, isCritical, trueHitValue)) {
            if (VARY_EFFECTIVE_FACTOR_SKILL_COEXIST) {
                weaponPow = Math.floor(weaponPow * this.getEffectiveFactor(passive));
            } else {
                weaponPow = Math.floor(weaponPow * this.getEffectiveFactor());
            }
        }

        return pow + weaponPow + supportPow;
    };
})();
