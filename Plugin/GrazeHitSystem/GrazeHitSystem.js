/*-----------------------------------------------------------------------------------------------------------------

かすりヒットシステム Ver.1.00


【概要】
命中率が一定以上のとき、攻撃が外れても最低保証としてダメージの一部を与えられる「かすりヒット」の概念を導入できます。
命中率が90%以上のときはかすりヒットでダメージ50%、命中率が80～89%のときは25%、という風に基準値を複数設定することもできます。
また、かすりヒットか通常ヒットかを見た目で判別できるようにダメージのポップアップの色を変えることもできます。


【使い方】
本プラグインの39～50行目のパラメータを任意に変更してください。


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
Ver.1.0  2024/10/30  初版


*----------------------------------------------------------------------------------------------------------------*/

(function () {
    /*-----------------------------------------------------------------------------------------------------------------
        パラメータ
    *----------------------------------------------------------------------------------------------------------------*/
    // 命中率何%以上のときにかすりヒットを許可するか
    // 複数設定する場合はカンマ区切りで降順にする
    var HIT_PERCENT_BORDER_ARRAY = [90, 80];

    // かすりヒット時のダメージの割合
    // 複数設定する場合はHIT_PERCENT_BORDER_ARRAYと対応するようにカンマ区切りにする
    var GRAZE_DAMAGE_RATE_ARRAY = [0.5, 0.25];

    // かすりヒット時のダメージのポップアップの色インデックス
    // ポップアップにはリソースの[UI]→[大きい数字]が使用される
    // ランタイムの場合、0:白 1:青 2:緑 3:赤 4:黒 となる
    var GRAZE_DAMAGE_POPUP_NUMBER_COLOR = 4;

    /*-----------------------------------------------------------------------------------------------------------------
        攻撃が外れたとき、命中率が一定以上ならダメージを再計算し命中した扱いにする
    *----------------------------------------------------------------------------------------------------------------*/
    var alias000 = AttackEvaluator.HitCritical.evaluateAttackEntry;
    AttackEvaluator.HitCritical.evaluateAttackEntry = function (virtualActive, virtualPassive, attackEntry) {
        alias000.call(this, virtualActive, virtualPassive, attackEntry);
        var i, count, active, passive, percent, damagePassive, border, damageRate;

        if (attackEntry.isHit) {
            return;
        }

        active = virtualActive.unitSelf;
        passive = virtualPassive.unitSelf;
        percent = HitCalculator.calculateHit(active, passive, virtualActive.weapon, virtualActive.totalStatus, virtualPassive.totalStatus);
        count = HIT_PERCENT_BORDER_ARRAY.length;

        for (i = 0; i < count; i++) {
            border = HIT_PERCENT_BORDER_ARRAY[i];

            if (percent < border) {
                continue;
            }

            damageRate = GRAZE_DAMAGE_RATE_ARRAY[i];
            damagePassive = this.calculateDamage(virtualActive, virtualPassive, attackEntry);
            attackEntry.damagePassive = Math.floor(damagePassive * damageRate);
            attackEntry.isHit = true;
            attackEntry.isGraze = true;

            break;
        }
    };

    /*-----------------------------------------------------------------------------------------------------------------
        かすりヒット時はダメージのポップアップの色を変える
    *----------------------------------------------------------------------------------------------------------------*/
    AttackOrder.isCurrentGraze = function () {
        var attackEntry = this.getCurrentEntry();
        return attackEntry.isGraze;
    };

    // ここからリアル戦闘用
    RealBattle._checkDamage = function (unit, damage, battler) {
        var order = this._order;
        var isCritical = order.isCurrentCritical();
        var isFinish = order.isCurrentFinish();
        var isGraze = order.isCurrentGraze();

        if (damage >= 0) {
            if (damage !== 0 || root.queryAnime("realnodamage") === null) {
                WeaponEffectControl.playDamageSound(unit, isCritical, isFinish);
            }
        }

        if (isGraze) {
            this._uiBattleLayout._isGraze = true;
        } else {
            this._uiBattleLayout._isGraze = false;
        }

        this._uiBattleLayout.setDamage(battler, damage, isCritical, isFinish);
    };

    UIBattleLayout._showDamagePopup = function (battler, damage, isCritical) {
        var effect = createObject(DamagePopupEffect);
        var pos = battler.getCenterPos(DamagePopup.WIDTH, DamagePopup.HEIGHT);
        var dy = 18;
        var offsetPos = EnemyOffsetControl.getOffsetPos(battler);

        effect.setPos(pos.x + offsetPos.x, pos.y + offsetPos.y + dy, damage, this._isGraze);
        effect.setCritical(isCritical);
        effect.setAsync(true);

        this._realBattle.pushCustomEffect(effect);
    };
    // ここまでリアル戦闘用

    // ここから簡易戦闘用
    EasyMapUnit._showDamagePopup = function (damage, isCritical) {
        var effect = createObject(DamagePopupEffect);
        var dx = Math.floor((DamagePopup.WIDTH - GraphicsFormat.CHARCHIP_WIDTH) / 2);
        var dy = Math.floor((DamagePopup.HEIGHT - GraphicsFormat.CHARCHIP_HEIGHT) / 2);
        var isGraze = this._order.isCurrentGraze();

        if (this._direction === DirectionType.TOP || this._direction === DirectionType.BOTTOM) {
            if (this._xPixel >= root.getGameAreaWidth() - 64) {
                dx -= 64;
            }
        } else if (this._direction === DirectionType.LEFT || this._direction === DirectionType.RIGHT) {
            if (this._yPixel >= root.getGameAreaHeight() - 32) {
                dy -= 32;
            } else {
                dy += 32;
            }

            dx -= 32;
        }

        effect.setPos(this._xPixel + dx, this._yPixel + dy, damage, isGraze);
        effect.setAsync(true);
        effect.setCritical(isCritical);
        this._easyBattle.pushCustomEffect(effect);
    };
    // ここまで簡易戦闘用

    DamagePopupEffect.setPos = function (x, y, damage, isGraze) {
        this._x = x;
        this._y = y;
        this._damage = damage;
        this._isGraze = isGraze;

        this._setupBallArray();
        this._setupBallPos();
        this._setupBallState();
    };

    DamagePopupEffect._createBallObject = function () {
        var obj;

        if (this._damage >= 0) {
            if (this._isGraze) {
                obj = createObject(GrazeDamageBall);
            } else {
                obj = createObject(DamageBall);
            }
        } else {
            obj = createObject(RecoveryBall);
        }

        return obj;
    };

    var GrazeDamageBall = defineObject(DamageBall, {
        _getNumberColorIndex: function () {
            return GRAZE_DAMAGE_POPUP_NUMBER_COLOR;
        }
    });
})();
