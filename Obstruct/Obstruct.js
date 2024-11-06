/*-----------------------------------------------------------------------------------------------------------------

障害物を設置する杖 Ver.1.10


【概要】
射程内の任意の1マスに通り抜け不可の障害物を設置する杖を導入できます。

障害物は以下の性質を持ちます。
・内部的には敵軍ユニットとして扱われるが、敵軍ユニットの攻撃対象になる
・ただし、敵軍ユニットは進路を塞がれているとき以外は障害物に攻撃しない
・目標確認画面で表示される敵軍の数に障害物は含まれない
・HPが0になるか、設置してから1ターン経過すると消滅する
・戦闘時は簡易戦闘になり、受けた攻撃は必ず命中する
・障害物を対象にとる行動では経験値を獲得できない
・一部の地形には設置できない


【使い方】
下記のURLからマニュアルを参照してください。
https://github.com/CordialBun/srpg-studio-plugin/tree/master/Obstruct#readme


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
Ver.1.00 2024/11/02 初版
Ver.1.10 2024/11/05 ウェイトターンシステムとの併用に対応。
                    敵軍ユニットの総数を判定する機能が正常に動作しない不具合を修正。

*----------------------------------------------------------------------------------------------------------------*/

(function () {
    /*-----------------------------------------------------------------------------------------------------------------
        設定項目
    *----------------------------------------------------------------------------------------------------------------*/
    // ウェイトターンシステムと併用する場合はtrue、しない場合はfalse
    var WAIT_TURN_SYSTEM_COEXISTS = false;
    // アイテムウィンドウに表示するテキスト
    var OBSTRUCT_ITEM_TYPE_NAME = "障害物設置";

    /*-----------------------------------------------------------------------------------------------------------------
        障害物を設置する杖の実装
    *----------------------------------------------------------------------------------------------------------------*/
    var ObstructItemSelection = defineObject(BaseItemSelection, {
        enterItemSelectionCycle: function (unit, item) {
            this._unit = unit;
            this._item = item;
            this._targetUnit = this._unit;
            this._targetPos = createPos(this._unit.getMapX(), this._unit.getMapY());
            this._targetClass = null;
            this._targetItem = null;
            this._isSelection = false;
            this._posSelector = createObject(ObstructPosSelector);

            return this.setInitialSelection();
        },

        setInitialSelection: function () {
            this.setPosSelection();
            return EnterResult.OK;
        },

        setPosSelection: function () {
            var indexArray = IndexArray.createIndexArray(this._unit.getMapX(), this._unit.getMapY(), this._item);

            indexArray = this._getVacantIndexArray(this._unit, indexArray);
            this._posSelector.setPosOnly(this._unit, this._item, indexArray, PosMenuType.Item);

            this.setFirstPos();
        },

        moveItemSelectionCycle: function () {
            var result = this._posSelector.movePosSelector();

            if (result === PosSelectorResult.SELECT) {
                if (this.isPosSelectable()) {
                    this._targetPos = this._posSelector.getSelectorPos(false);
                    this._isSelection = true;
                    this._posSelector.endPosSelector();
                    return MoveResult.END;
                }
            } else if (result === PosSelectorResult.CANCEL) {
                this._isSelection = false;
                this._posSelector.endPosSelector();
                return MoveResult.END;
            }

            return MoveResult.CONTINUE;
        },

        _getVacantIndexArray: function (unit, indexArray) {
            var i, index, x, y;
            var indexArrayNew = [];
            var count = indexArray.length;
            var obj = ItemPackageControl.getItemAvailabilityObject(this._item);

            if (obj === null) {
                return indexArrayNew;
            }

            for (i = 0; i < count; i++) {
                index = indexArray[i];
                x = CurrentMap.getX(index);
                y = CurrentMap.getY(index);
                if (obj.isPosEnabled(unit, this._item, x, y)) {
                    indexArrayNew.push(index);
                }
            }

            return indexArrayNew;
        },

        setFirstPos: function () {
            this._posSelector.setFirstPos();
        },

        isPosSelectable: function () {
            var pos = this._posSelector.getSelectorPos(true);

            if (pos === null) {
                return false;
            }

            return true;
        }
    });

    var ItemObstructUseMode = {
        FOCUS: 0,
        DEST: 1,
        END: 2,
        ANIME: 3
    };

    var ObstructItemUse = defineObject(BaseItemUse, {
        _itemUseParent: null,
        _targetPos: null,
        _dynamicAnime: null,

        enterMainUseCycle: function (itemUseParent) {
            var itemTargetInfo = itemUseParent.getItemTargetInfo();

            this._itemUseParent = itemUseParent;
            this._targetPos = itemTargetInfo.targetPos;

            if (itemUseParent.isItemSkipMode()) {
                this.mainAction();
                return EnterResult.NOTENTER;
            }

            this.changeCycleMode(ItemObstructUseMode.FOCUS);

            return EnterResult.OK;
        },

        moveMainUseCycle: function () {
            var mode = this.getCycleMode();
            var result = MoveResult.CONTINUE;

            if (mode === ItemObstructUseMode.FOCUS) {
                result = this._moveFocus();
            } else if (mode === ItemObstructUseMode.DEST) {
                result = this._moveDest();
            } else if (mode === ItemObstructUseMode.ANIME) {
                result = this._moveAnime();
            } else if (mode === ItemObstructUseMode.END) {
                result = this._moveEnd();
            }

            return result;
        },

        drawMainUseCycle: function () {
            var mode = this.getCycleMode();

            if (mode === ItemObstructUseMode.ANIME) {
                this._dynamicAnime.drawDynamicAnime();
            }
        },

        mainAction: function () {
            var i, x, y, count, unit, pageData, generator, userId;
            var posData = null;
            var mapInfo = root.getCurrentSession().getCurrentMapInfo();
            var dummyX = mapInfo.custom.obstructDummyX;
            var dummyY = mapInfo.custom.obstructDummyY;

            if (typeof dummyX !== "number" || typeof dummyY !== "number") {
                return;
            }

            count = mapInfo.getReinforcementPosCount();
            for (i = 0; i < count; i++) {
                posData = mapInfo.getReinforcementPos(i);
                x = posData.getX();
                y = posData.getY();

                if (x === dummyX && y === dummyY) {
                    break;
                }

                posData = null;
            }

            if (posData === null) {
                return;
            }

            pageData = posData.getReinforcementPage(0);
            generator = root.getObjectGenerator();

            unit = generator.generateUnitFromRefinforcementPage(pageData);
            if (unit !== null) {
                unit.setMapX(this._targetPos.x);
                unit.setMapY(this._targetPos.y);
                UnitProvider.setupFirstUnit(unit);

                if (WAIT_TURN_SYSTEM_COEXISTS) {
                    userId = this._itemUseParent._itemTargetInfo.unit.getId();
                    unit.custom.userId = userId;
                }
            }
        },

        _moveFocus: function () {
            var generator;

            generator = root.getEventGenerator();
            generator.locationFocus(this._targetPos.x, this._targetPos.y, true);
            generator.execute();

            this.changeCycleMode(ItemObstructUseMode.DEST);

            return MoveResult.CONTINUE;
        },

        _moveDest: function () {
            this._showAnime(this._targetPos.x, this._targetPos.y);
            this.changeCycleMode(ItemObstructUseMode.ANIME);

            return MoveResult.CONTINUE;
        },

        _moveAnime: function () {
            if (this._dynamicAnime.moveDynamicAnime() !== MoveResult.CONTINUE) {
                this.changeCycleMode(ItemObstructUseMode.END);
            }

            return MoveResult.CONTINUE;
        },

        _moveEnd: function () {
            this.mainAction();
            return MoveResult.END;
        },

        _showAnime: function (xTarget, yTarget) {
            var x = LayoutControl.getPixelX(xTarget);
            var y = LayoutControl.getPixelY(yTarget);
            var anime = this._itemUseParent.getItemTargetInfo().item.getItemAnime();
            var pos = LayoutControl.getMapAnimationPos(x, y, anime);

            this._dynamicAnime = createObject(DynamicAnime);
            this._dynamicAnime.startDynamicAnime(anime, pos.x, pos.y);
        }
    });

    var ObstructItemInfo = defineObject(BaseItemInfo, {
        drawItemInfoCycle: function (x, y) {
            ItemInfoRenderer.drawKeyword(x, y, OBSTRUCT_ITEM_TYPE_NAME);
            y += ItemInfoRenderer.getSpaceY();

            this.drawRange(x, y, this._item.getRangeValue(), this._item.getRangeType());
        },

        getInfoPartsCount: function () {
            return 2;
        }
    });

    var ObstructItemPotency = defineObject(BaseItemPotency, {});

    var ObstructItemAvailability = defineObject(BaseItemAvailability, {
        isPosEnabled: function (unit, item, x, y) {
            var terrain, isObstacleAllowed;
            var posUnit = PosChecker.getUnitFromPos(x, y);

            if (posUnit !== null) {
                return false;
            }

            terrain = PosChecker.getTerrainFromPos(x, y);
            isObstacleAllowed = terrain.custom.isObstacleAllowed;

            if (typeof isObstacleAllowed === "boolean" && !isObstacleAllowed) {
                return false;
            }

            return true;
        }
    });

    var alias001 = ItemPackageControl.getCustomItemSelectionObject;
    ItemPackageControl.getCustomItemSelectionObject = function (item, keyword) {
        var obj = alias001.call(this, item, keyword);

        if (keyword === "obstruct") {
            return ObstructItemSelection;
        }

        return obj;
    };

    var alias002 = ItemPackageControl.getCustomItemUseObject;
    ItemPackageControl.getCustomItemUseObject = function (item, keyword) {
        var obj = alias002.call(this, item, keyword);

        if (keyword === "obstruct") {
            return ObstructItemUse;
        }

        return obj;
    };

    var alias003 = ItemPackageControl.getCustomItemInfoObject;
    ItemPackageControl.getCustomItemInfoObject = function (item, keyword) {
        var obj = alias003.call(this, item, keyword);

        if (keyword === "obstruct") {
            return ObstructItemInfo;
        }

        return obj;
    };

    var alias004 = ItemPackageControl.getCustomItemPotencyObject;
    ItemPackageControl.getCustomItemPotencyObject = function (item, keyword) {
        var obj = alias004.call(this, item, keyword);

        if (keyword === "obstruct") {
            return ObstructItemPotency;
        }

        return obj;
    };

    var alias005 = ItemPackageControl.getCustomItemAvailabilityObject;
    ItemPackageControl.getCustomItemAvailabilityObject = function (item, keyword) {
        var obj = alias005.call(this, item, keyword);

        if (keyword === "obstruct") {
            return ObstructItemAvailability;
        }

        return obj;
    };

    var ObstructPosSelector = defineObject(PosSelector, {
        setPosOnly: function (unit, item, indexArray, type) {
            this._unit = unit;
            this._indexArray = indexArray;
            MapLayer.getMapChipLight().setIndexArray(indexArray);
            this._setPosMenu(unit, item, type);
            this._posCursor = createObject(ObstructCursor);
            this._posCursor.setParentSelector(this);
        },

        getUnit: function () {
            return this._unit;
        }
    });

    var ObstructCursor = defineObject(PosFreeCursor, {
        setFirstPos: function () {
            var unit = this._parentSelector.getUnit();
            var x = unit.getMapX();
            var y = unit.getMapY();

            MapView.changeMapCursor(x, y);
        }
    });

    /*-----------------------------------------------------------------------------------------------------------------
        障害物は壁として扱う
    *----------------------------------------------------------------------------------------------------------------*/
    var alias006 = SimulationBlockerControl._configureBlockerRule;
    SimulationBlockerControl._configureBlockerRule = function (groupArray) {
        alias006.call(this, groupArray);
        var rule = {
            isRuleApplicable: function (unit) {
                return true;
            },

            isTargetBlocker: function (unit, targetUnit) {
                var isObstacle = targetUnit.custom.isObstacle;

                if (typeof isObstacle === "boolean" && isObstacle) {
                    return true;
                }

                return false;
            }
        };

        groupArray.push(rule);
    };

    /*-----------------------------------------------------------------------------------------------------------------
        障害物は敵軍だが、敵軍ユニットの攻撃対象になる
    *----------------------------------------------------------------------------------------------------------------*/
    var alias007 = FilterControl.getListArray;
    FilterControl.getListArray = function (filter) {
        var i, count, enemyList, newList, arr, unit, isObstacle;
        var listArray = alias007.call(this, filter);

        if (filter & UnitFilterFlag.PLAYER) {
            enemyList = EnemyList.getAliveList();
            newList = StructureBuilder.buildDataList();
            arr = [];

            count = enemyList.getCount();
            for (i = 0; i < count; i++) {
                unit = enemyList.getData(i);
                isObstacle = unit.custom.isObstacle;

                if (typeof isObstacle === "boolean" && isObstacle) {
                    arr.push(unit);
                }
            }

            if (arr.length > 0) {
                newList.setDataArray(arr);
                listArray.push(newList);
            }
        }

        return listArray;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        障害物との戦闘時は簡易戦闘にする
    *----------------------------------------------------------------------------------------------------------------*/
    var alias008 = CoreAttack._isAnimeEmpty;
    CoreAttack._isAnimeEmpty = function (unitSrc, unitDest) {
        var isObstacle;
        var result = alias008.call(this, unitSrc, unitDest);

        if (result) {
            return true;
        }

        isObstacle = unitDest.custom.isObstacle;
        if (isObstacle !== null && typeof isObstacle === "boolean" && isObstacle) {
            return true;
        }

        return false;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        障害物には必ず攻撃が命中する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias009 = HitCalculator.calculateHit;
    HitCalculator.calculateHit = function (active, passive, weapon, activeTotalStatus, passiveTotalStatus) {
        var percent = alias009.call(this, active, passive, weapon, activeTotalStatus, passiveTotalStatus);
        var isObstacle = passive.custom.isObstacle;

        if (isObstacle !== null && typeof isObstacle === "boolean" && isObstacle) {
            return 100;
        }

        return percent;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        障害物を対象にとる行動では経験値を獲得できない
    *----------------------------------------------------------------------------------------------------------------*/
    var alias010 = ExperienceCalculator.calculateExperience;
    ExperienceCalculator.calculateExperience = function (data) {
        var exp = alias010.call(this, data);
        var passive = data.passive;
        var isObstacle = passive.custom.isObstacle;

        if (typeof isObstacle === "boolean" && isObstacle) {
            return 0;
        }

        return exp;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        障害物は基本的には敵に狙われないようにする
    *----------------------------------------------------------------------------------------------------------------*/
    var alias011 = BaseCombinationCollector._checkTargetScore;
    BaseCombinationCollector._checkTargetScore = function (unit, targetUnit) {
        var score = alias011.call(this, unit, targetUnit);
        var isObstacle = targetUnit.custom.isObstacle;
        var isBlockingObstacle = targetUnit.custom.isBlockingObstacle;

        // 進路を塞いでいる障害物のみ、従来のスコアを使う
        if (typeof isBlockingObstacle === "boolean" && isBlockingObstacle) {
            return score;
        }

        // 進路を塞いでいない障害物は攻撃対象にならない
        if (typeof isObstacle === "boolean" && isObstacle) {
            return -1;
        }

        return score;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        突撃型のユニットの進路を塞いでいるときのみ狙われるようにする
    *----------------------------------------------------------------------------------------------------------------*/
    AutoActionBuilder.buildApproachAction = function (unit, autoActionArray) {
        var combination;

        // 現在位置から攻撃可能なユニットの中で、最も優れた組み合わせを取得する
        combination = CombinationManager.getApproachCombination(unit, true);
        if (combination === null) {
            // 現在位置から攻撃できるユニットは存在しないため、範囲を広げて相手を探すことになる。
            // ただし、その前に範囲内のみを攻撃するように設定されているかを調べる。
            if (unit.getAIPattern().getApproachPatternInfo().isRangeOnly()) {
                // 範囲内のみ攻撃を行うと設定されていたため、何もしない。
                // 既に、範囲内で攻撃できないことを確認しているため問題ない。
                return this._buildEmptyAction();
            } else {
                // 現在位置では攻撃可能な相手がいないため、どの敵を狙うべきかを取得する
                combination = CombinationManager.getEstimateCombination(unit);
                if (combination === null) {
                    return this._buildEmptyAction();
                } else {
                    if (combination.isApproachObtacle) {
                        // 進路を塞いでいる障害物があるときはそれに攻撃する
                        this._pushGeneral(unit, autoActionArray, combination);
                    } else {
                        // 移動先を設定する
                        this._pushMove(unit, autoActionArray, combination);

                        // 移動の後には待機を行うため、それを設定する
                        this._pushWait(unit, autoActionArray, combination);
                    }
                }
            }
        } else {
            this._pushGeneral(unit, autoActionArray, combination);
        }

        return true;
    };

    CombinationManager.getEstimateCombination = function (unit) {
        var combinationArray, combinationIndex, combination, blockingObstacle;
        var simulator = root.getCurrentSession().createMapSimulator();
        var misc = CombinationBuilder.createMisc(unit, simulator);

        // 検証の範囲は、マップ全体
        simulator.startSimulation(unit, CurrentMap.getWidth() * CurrentMap.getHeight());

        // 移動に関する組み合わせの配列を作成する
        combinationArray = CombinationBuilder.createMoveCombinationArray(misc);
        if (combinationArray.length === 0) {
            // 進路がない、あるいは全て障害物に塞がれているとき
            combinationArray = this._getDisregardObstacleCombinationArray(unit, simulator);

            if (combinationArray.length === 0) {
                combinationArray = this._getChaseCombinationArray(misc);

                if (combinationArray.length === 0) {
                    return null;
                }
            }
        }

        // 組み合わせの配列から最も優れたもののインデックスを取得
        combinationIndex = CombinationSelectorEx.getEstimateCombinationIndex(unit, combinationArray);
        if (combinationIndex < 0) {
            return null;
        }

        // これにより、combinationに最良の組み合わせが格納される
        combination = combinationArray[combinationIndex];

        // combination.posIndexには移動すべき位置を表すindexが格納されている。
        // そのindexが示す位置に、どのようなコースをたどって移動するかをcreateExtendCourceで作成する
        combination.cource = CourceBuilder.createExtendCource(unit, combination.posIndex, simulator);

        // 進路を塞いでいる障害物があるか確認
        blockingObstacle = this._getBlockingObstacle(unit, combination.cource);

        if (blockingObstacle !== null) {
            // 進路を塞いでいる障害物のみを攻撃対象とした索敵の処理
            blockingObstacle.custom.isBlockingObstacle = true;
            combination = this._getApproachObstacleCombination(unit, blockingObstacle);
            delete blockingObstacle.custom.isBlockingObstacle;
        }

        return combination;
    };

    // 考え方としては、特定の障害物を一時的に消した状態でstartSimulationとcreateMoveCombinationArrayを呼び出し、
    // combinationArray.lengthが1以上だった場合、その障害物は敵ユニットの進路を塞いでいるとみなせる
    // これに該当する障害物を洗い出すため、障害物の「消す」「消さない」の組み合わせの部分集合を全探索する
    // 条件を満たす組み合わせはビット列として記録し、最後にそれらの論理和を求めれば、進路を塞いでいる障害物のみ全て抽出できる
    // この方法なら、例えば「2個の障害物が連なって進路を塞いでいる」というケースにも対応できる
    // (1個ずつ消すだけだと上記のようなケースは進路を塞いでいると判定できず漏れてしまう)
    CombinationManager._getDisregardObstacleCombinationArray = function (unit, simulator) {
        var i, bit, targetBit, count2, bitBorder, targetUnit, isObstacle, isApplicable, misc;
        var list = EnemyList.getAliveList();
        var count = list.getCount();
        var obstacleArray = [];
        var combinationArray = [];
        var applicableBitArray = [];
        var applicableBitSum = 0;

        for (i = 0; i < count; i++) {
            targetUnit = list.getData(i);
            isObstacle = targetUnit.custom.isObstacle;

            if (typeof isObstacle === "boolean" && isObstacle) {
                obstacleArray.push(targetUnit);
            }
        }

        if (obstacleArray.length === 0) {
            return combinationArray;
        }

        count = obstacleArray.length;
        bitBorder = Math.pow(2, count);
        for (bit = 0; bit < bitBorder; bit++) {
            for (i = 0; i < count; i++) {
                if (((bit >> i) & 1) === 1) {
                    targetUnit = obstacleArray[i];
                    targetUnit.setAliveState(AliveType.ERASE);
                }
            }

            misc = CombinationBuilder.createMisc(unit, simulator);
            simulator.startSimulation(unit, CurrentMap.getWidth() * CurrentMap.getHeight());
            combinationArray = CombinationBuilder.createMoveCombinationArray(misc);

            if (combinationArray.length > 0) {
                count2 = applicableBitArray.length;
                isApplicable = true;

                for (i = 0; i < count2; i++) {
                    targetBit = applicableBitArray[i];

                    if ((bit & targetBit) === targetBit) {
                        // この場合、bitは既にapplicableBitArrayに入っているビット列の上位集合なので、
                        // applicableBitArrayに格納する必要はない
                        isApplicable = false;
                        break;
                    }
                }

                if (isApplicable) {
                    applicableBitArray.push(bit);
                }
            }

            for (i = 0; i < count; i++) {
                if (((bit >> i) & 1) === 1) {
                    targetUnit = obstacleArray[i];
                    targetUnit.setAliveState(AliveType.ALIVE);
                }
            }
        }

        if (applicableBitArray.length === 0) {
            return [];
        }

        count = applicableBitArray.length;
        for (i = 0; i < count; i++) {
            applicableBitSum |= applicableBitArray[i];
        }

        count = obstacleArray.length;
        for (i = 0; i < count; i++) {
            if (((applicableBitSum >> i) & 1) === 1) {
                targetUnit = obstacleArray[i];
                targetUnit.setAliveState(AliveType.ERASE);
            }
        }

        misc = CombinationBuilder.createMisc(unit, simulator);
        simulator.startSimulation(unit, CurrentMap.getWidth() * CurrentMap.getHeight());
        combinationArray = CombinationBuilder.createMoveCombinationArray(misc);

        for (i = 0; i < count; i++) {
            if (((applicableBitSum >> i) & 1) === 1) {
                targetUnit = obstacleArray[i];
                targetUnit.setAliveState(AliveType.ALIVE);
            }
        }

        return combinationArray;
    };

    CombinationManager._getBlockingObstacle = function (unit, cource) {
        var i, count, direction, targetUnit, isObstacle;
        var x = unit.getMapX();
        var y = unit.getMapY();
        var blockingObstacle = null;

        count = cource.length;
        for (i = 0; i < count; i++) {
            direction = cource[i];

            switch (direction) {
                case DirectionType.LEFT:
                    x--;
                    break;
                case DirectionType.TOP:
                    y--;
                    break;
                case DirectionType.RIGHT:
                    x++;
                    break;
                case DirectionType.BOTTOM:
                    y++;
                    break;
            }

            targetUnit = PosChecker.getUnitFromPos(x, y);

            if (targetUnit === null) {
                continue;
            }

            isObstacle = targetUnit.custom.isObstacle;
            if (typeof isObstacle === "boolean" && isObstacle) {
                blockingObstacle = targetUnit;
                break;
            }
        }

        return blockingObstacle;
    };

    CombinationManager._getApproachObstacleCombination = function (unit, blockingObstacle) {
        var i, count, combinationArray, combinationIndex, combination, targetUnit;
        var misc = CombinationBuilder.createMisc(unit, root.getCurrentSession().createMapSimulator());
        var newCombinationArray = [];

        misc.simulator.startSimulation(unit, ParamBonus.getMov(unit));
        combinationArray = CombinationBuilder.createApproachCombinationArray(misc);

        count = combinationArray.length;
        for (i = 0; i < count; i++) {
            combination = combinationArray[i];
            targetUnit = combination.targetUnit;

            if (targetUnit.getId() === blockingObstacle.getId()) {
                newCombinationArray.push(combination);
            }
        }

        combinationIndex = CombinationSelector.getCombinationIndex(unit, newCombinationArray);
        if (combinationIndex < 0) {
            return null;
        }

        combination = combinationArray[combinationIndex];
        combination.cource = CourceBuilder.createRangeCource(unit, combination.posIndex, combination.simulator);
        combination.isApproachObtacle = true;

        return combination;
    };

    var alias012 = BaseCombinationCollector._createAndPushCombination;
    BaseCombinationCollector._createAndPushCombination = function (misc) {
        var combination = alias012.call(this, misc);

        combination.isApproachObtacle = false;

        return combination;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        障害物のユニットメニューは表示できないようにする
    *----------------------------------------------------------------------------------------------------------------*/
    MapEdit._openMenu = function (unit) {
        var screenParam, result, isObstacle;

        if (unit !== null) {
            isObstacle = unit.custom.isObstacle;

            if (typeof isObstacle === "boolean" && isObstacle) {
                result = MapEditResult.MAPCHIPCANCEL;
            } else {
                screenParam = this._createScreenParam();
                this._unitMenu = createObject(UnitMenuScreen);
                SceneManager.addScreen(this._unitMenu, screenParam);
                this.changeCycleMode(MapEditMode.UNITMENU);

                result = MapEditResult.NONE;
            }
        } else {
            result = MapEditResult.MAPCHIPCANCEL;
        }

        return result;
    };

    var alias013 = UnitMenuScreen._getUnitList;
    UnitMenuScreen._getUnitList = function (unit) {
        var i, count, newList, arr, targetUnit, isObstacle;
        var list = alias013.call(this, unit);
        var type = unit.getUnitType();

        if (type !== UnitType.ENEMY) {
            return list;
        }

        newList = StructureBuilder.buildDataList();
        arr = [];
        count = list.getCount();

        for (i = 0; i < count; i++) {
            targetUnit = list.getData(i);
            isObstacle = targetUnit.custom.isObstacle;

            if (typeof isObstacle === "boolean" && isObstacle) {
                continue;
            }

            arr.push(targetUnit);
        }

        newList.setDataArray(arr);

        return newList;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        目標確認画面では障害物を敵軍ユニットの生存数にカウントしない
    *----------------------------------------------------------------------------------------------------------------*/
    var alias014 = ObjectiveFaceZone._getTotalValue;
    ObjectiveFaceZone._getTotalValue = function (unitType) {
        var i, count, list, unit, isObstacle, obstacleCount;
        var result = alias014.call(this, unitType);

        if (unitType !== UnitType.ENEMY) {
            return result;
        }

        obstacleCount = 0;
        list = EnemyList.getAliveDefaultList();

        count = list.getCount();
        for (i = 0; i < count; i++) {
            unit = list.getData(i);
            isObstacle = unit.custom.isObstacle;

            if (typeof isObstacle === "boolean" && isObstacle) {
                obstacleCount++;
            }
        }

        return result - obstacleCount;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        ユニットの行動終了後にobstacleCountとdefeatedObstacleCountを更新する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias015 = UnitCommand.endCommandAction;
    UnitCommand.endCommandAction = function (command) {
        alias015.call(this, command);
        CDB_updateObstacleCount();
    };

    EnemyTurn._moveAutoAction = function () {
        // this._autoActionIndexで識別されている行動を終えたか調べる
        if (this._autoActionArray[this._autoActionIndex].moveAutoAction() !== MoveResult.CONTINUE) {
            CDB_updateObstacleCount();

            if (!this._countAutoActionIndex()) {
                this._changeIdleMode(EnemyTurnMode.TOP, this._getIdleValue());
            }
        }

        return MoveResult.CONTINUE;
    };

    /*-----------------------------------------------------------------------------------------------------------------
        自軍フェイズ開始時に障害物は自動的に消滅する
    *----------------------------------------------------------------------------------------------------------------*/
    var alias016 = TurnChangeStart.pushFlowEntries;
    TurnChangeStart.pushFlowEntries = function (straightFlow) {
        alias016.call(this, straightFlow);
        var turnType = root.getCurrentSession().getTurnType();

        if (turnType === TurnType.PLAYER) {
            straightFlow.pushFlowEntry(ObstacleFlowEntry);
        }
    };

    var ObstacleFlowEntry = defineObject(BaseFlowEntry, {
        _straightFlow: null,
        _obstacleArray: null,

        enterFlowEntry: function () {
            this._straightFlow = createObject(ObstacleStraightFlow);
            this._obstacleArray = [];
            this._checkObstacle();
            this._straightFlow.setStraightFlowData(this._obstacleArray);
            this._pushFlowEntries(this._straightFlow);

            return this._straightFlow.enterStraightFlow();
        },

        moveFlowEntry: function () {
            return this._straightFlow.moveStraightFlow();
        },

        drawFlowEntry: function () {
            this._straightFlow.drawStraightFlow();
        },

        _checkObstacle: function () {
            var i, unit, isObstacle, atUnit, userId;
            var list = EnemyList.getAliveList();
            var count = list.getCount();

            if (WAIT_TURN_SYSTEM_COEXISTS) {
                atUnit = WaitTurnOrderManager.getATUnit();

                if (atUnit === null) {
                    return;
                }
            }

            for (i = 0; i < count; i++) {
                unit = list.getData(i);
                isObstacle = unit.custom.isObstacle;

                if (typeof isObstacle === "boolean" && isObstacle) {
                    if (WAIT_TURN_SYSTEM_COEXISTS) {
                        userId = unit.custom.userId;

                        if (typeof userId === "number" && atUnit.getId() === userId) {
                            this._obstacleArray.push(unit);
                        }
                    } else {
                        this._obstacleArray.push(unit);
                    }
                }
            }
        },

        _pushFlowEntries: function (straightFlow) {
            var i;
            var count = this._obstacleArray.length;

            for (i = 0; i < count; i++) {
                straightFlow.pushFlowEntry(ObstacleEraseFlowEntry);
            }
        }
    });

    var ObstacleStraightFlow = defineObject(StraightFlow, {
        enterStraightFlow: function () {
            var i;
            var count = this._entryArray.length;

            for (i = this._entryIndex; i < count; i++) {
                if (this._entryArray[i].enterFlowEntry(this._flowData[i]) === EnterResult.OK) {
                    return EnterResult.OK;
                }

                this._entryIndex++;
            }

            return EnterResult.NOTENTER;
        },

        drawStraightFlow: function () {
            if (this._entryArray.length === 0) {
                return;
            }

            if (this._entryArray.length <= this._entryIndex) {
                return;
            }

            this._entryArray[this._entryIndex].drawFlowEntry();
        }
    });

    var ObstacleEraseFlowEntry = defineObject(BaseFlowEntry, {
        _unit: null,
        _eraseCounter: null,

        enterFlowEntry: function (unit) {
            this._unit = unit;
            this._doAction();

            if (this.isFlowSkip()) {
                return EnterResult.NOTENTER;
            }

            this._unit.setInvisible(true);
            this._eraseCounter = createObject(EraseCounter);

            return EnterResult.OK;
        },

        moveFlowEntry: function () {
            return this._eraseCounter.moveEraseCounter();
        },

        drawFlowEntry: function () {
            var unit = this._unit;
            var x = LayoutControl.getPixelX(unit.getMapX());
            var y = LayoutControl.getPixelY(unit.getMapY());
            var alpha = this._eraseCounter.getEraseAlpha();
            var unitRenderParam = StructureBuilder.buildUnitRenderParam();
            var colorIndex = unit.getUnitType();
            var animationIndex = MapLayer.getAnimationIndexFromUnit(unit);

            if (unit.isWait()) {
                colorIndex = 3;
            }

            if (unit.isActionStop()) {
                animationIndex = 1;
            }

            unitRenderParam.colorIndex = colorIndex;
            unitRenderParam.animationIndex = animationIndex;
            unitRenderParam.alpha = alpha;

            UnitRenderer.drawScrollUnit(unit, x, y, unitRenderParam);
        },

        _doAction: function () {
            var unit = this._unit;
            var mapCustom = root.getCurrentSession().getCurrentMapInfo().custom;

            unit.setHp(0);
            DamageControl.setDeathState(unit);

            if (typeof mapCustom.obstacleCount === "number") {
                mapCustom.obstacleCount--;
            } else {
                mapCustom.obstacleCount = 0;
            }

            if (typeof mapCustom.defeatedObstacleCount === "number") {
                mapCustom.defeatedObstacleCount++;
            } else {
                mapCustom.defeatedObstacleCount = 1;
            }
        }
    });

    /*-----------------------------------------------------------------------------------------------------------------
        obstacleCountとdefeatedObstacleCountを更新する関数
    *----------------------------------------------------------------------------------------------------------------*/
    CDB_updateObstacleCount = function () {
        var i, count, unit, isObstacle;
        var list = EnemyList.getAliveList();
        var mapCustom = root.getCurrentSession().getCurrentMapInfo().custom;
        var obstacleCount = mapCustom.obstacleCount;
        var newObstacleCount = 0;

        count = list.getCount();
        for (i = 0; i < count; i++) {
            unit = list.getData(i);
            isObstacle = unit.custom.isObstacle;

            if (typeof isObstacle === "boolean" && isObstacle) {
                newObstacleCount++;
            }
        }

        if (typeof obstacleCount === "number" && newObstacleCount < obstacleCount) {
            if (typeof mapCustom.defeatedObstacleCount === "number") {
                mapCustom.defeatedObstacleCount += obstacleCount - newObstacleCount;
            } else {
                mapCustom.defeatedObstacleCount = obstacleCount - newObstacleCount;
            }
        }

        mapCustom.obstacleCount = newObstacleCount;
    };
})();

/*-----------------------------------------------------------------------------------------------------------------
    敵軍のユニット総数をイベント条件にするときはスクリプトでこれを呼ぶ
*----------------------------------------------------------------------------------------------------------------*/
CDB_checkEnemyCountExcludedObstacle = function (count, overUnderType, aliveType) {
    var enemyCount;
    var mapInfo = root.getCurrentSession().getCurrentMapInfo();
    var obstacleCount = mapInfo.custom.obstacleCount;
    var defeatedObstacleCount = mapInfo.custom.defeatedObstacleCount;
    var result = false;

    if (typeof obstacleCount !== "number") {
        obstacleCount = 0;
        mapInfo.custom.obstacleCount = obstacleCount;
    }

    if (typeof defeatedObstacleCount !== "number") {
        defeatedObstacleCount = 0;
        mapInfo.custom.defeatedObstacleCount = defeatedObstacleCount;
    }

    switch (aliveType) {
        case AliveType.ALIVE:
            enemyCount = EnemyList.getAliveList().getCount() - obstacleCount;
            break;
        case AliveType.DEATH:
            enemyCount = EnemyList.getDeathList().getCount() - defeatedObstacleCount;
            break;
        default:
            return result;
    }

    if (overUnderType === OverUnderType.EQUAL && count === enemyCount) {
        result = true;
    } else if (overUnderType === OverUnderType.OVER && count > enemyCount) {
        result = true;
    } else if (overUnderType === OverUnderType.UNDER && count < enemyCount) {
        result = true;
    } else if (overUnderType === OverUnderType.NOTEQUALSTO && count !== enemyCount) {
        result = true;
    }

    return result;
};
