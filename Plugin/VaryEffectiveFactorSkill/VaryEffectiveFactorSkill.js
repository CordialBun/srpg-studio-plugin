/*-----------------------------------------------------------------------------------------------------------------

スキル「特効耐性」 Ver.1.10


【概要】
特効は特定の条件(クラスタイプなど)を満たすユニットに対して攻撃する時に
コンフィグで設定した特効係数の分だけ攻撃力に補正がかかる(デフォルトだと200%)というシステムですが、
このスキルを持つユニットに対しては上記の特効係数の代わりに、
スキルのカスタムパラメータに設定した値の分だけ補正がかかるようになります。

例えばコンフィグの特効係数を300、特効耐性スキルのカスパラの値を150にすると、
攻撃力12のユニットから特効武器で攻撃されたときに通常なら攻撃力36として計算するところが18になり、
結果特効の補正を軽減することができます。

分かりやすさ重視で耐性と銘打ってはいますが、
カスパラの値をコンフィグの特効係数の値より大きくすれば逆に補正を増加させることもできます。


【使い方】
カスタムスキルのキーワードに varyEffectiveFactor を、カスタムパラメータに以下を設定します。
XXには任意の数値を入力してください(被特効時にこの数値の分だけ相手の攻撃力に補正がかかるようになります)。

{
    arbFactor: XX
}

プラグイン「特効係数を攻撃力ではなく武器の威力に適用する」と併用する場合、
設定項目のAPPLY_EFFECTIVENESS_TO_WEAPON_POWER_COEXISTをtrueに変更してください。


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
Ver.1.00 2024/10/13 初版
Ver.1.10 2024/11/16 プラグイン「特効係数を攻撃力ではなく武器の威力に適用する」との併用に対応。


*----------------------------------------------------------------------------------------------------------------*/

(function () {
    /*-----------------------------------------------------------------------------------------------------------------
        設定項目
    *----------------------------------------------------------------------------------------------------------------*/
    // プラグイン「特効係数を攻撃力ではなく武器の威力に適用する」と併用する場合はtrue、しない場合はfalse
    var APPLY_EFFECTIVENESS_TO_WEAPON_POWER_COEXIST = false;

    // 設定項目はここまで

    if (!APPLY_EFFECTIVENESS_TO_WEAPON_POWER_COEXIST) {
        DamageCalculator.calculateAttackPower = function (active, passive, weapon, isCritical, totalStatus, trueHitValue) {
            var pow =
                AbilityCalculator.getPower(active, weapon) +
                CompatibleCalculator.getPower(active, passive, weapon) +
                SupportCalculator.getPower(totalStatus);

            if (this.isEffective(active, passive, weapon, isCritical, trueHitValue)) {
                pow = Math.floor(pow * this.getEffectiveFactor(passive));
            }

            return pow;
        };
    }

    DamageCalculator.getEffectiveFactor = function (passive) {
        var effectiveFactor;
        var skill = SkillControl.getPossessionCustomSkill(passive, "varyEffectiveFactor");

        if (skill !== null && typeof skill.custom.arbFactor === "number") {
            effectiveFactor = skill.custom.arbFactor;
        } else {
            effectiveFactor = DataConfig.getEffectiveFactor();
        }

        return effectiveFactor / 100;
    };
})();
