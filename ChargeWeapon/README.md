<!-- omit in toc -->

# チャージ武器

![image](https://github.com/user-attachments/assets/7bfec7a2-ed79-4ead-991a-da9fabeacb76)

> [!NOTE]
> 本プラグインはウェイトターンシステムの拡張機能です。
> ウェイトターンシステムとの併用を前提としており、単体では動作しません。

<br>

**チャージ武器**は通常の武器と異なり、攻撃を行うために一定の溜め時間を必要とする武器です。

本プラグインを導入することでチャージ武器を実装できます。

<br>

-   [チャージ武器](#チャージ武器)
    -   [1. 仕様](#1-仕様)
        -   [1.1. デモ](#11-デモ)
        -   [1.2. チャージコマンドとチャージタイム](#12-チャージコマンドとチャージタイム)
        -   [1.3. チャージ状態のときにできること](#13-チャージ状態のときにできること)
        -   [1.4. チャージ武器で攻撃する条件](#14-チャージ武器で攻撃する条件)
        -   [1.5. チャージ解除](#15-チャージ解除)
        -   [1.6. 攻撃時の武器選択](#16-攻撃時の武器選択)
        -   [1.7. チャージの種別](#17-チャージの種別)
    -   [2. 導入手順](#2-導入手順)
        -   [2.1. ファイルを Plugin フォルダ配下に保存する](#21-ファイルを-plugin-フォルダ配下に保存する)
        -   [2.2. スクリプト内の変数の設定](#22-スクリプト内の変数の設定)
        -   [2.3. 武器のカスタムパラメータの設定](#23-武器のカスタムパラメータの設定)
        -   [2.4. ステートの設定](#24-ステートの設定)
    -   [3. 追加設定](#3-追加設定)
        -   [3.1. 自軍以外のユニットのカスタムパラメータの設定](#31-自軍以外のユニットのカスタムパラメータの設定)
        -   [3.2. 独自のユニットコマンドを導入しているときの設定](#32-独自のユニットコマンドを導入しているときの設定)

<br>

## 1. 仕様

### 1.1. デモ

![gif](https://github.com/user-attachments/assets/af676812-5094-4c44-bce1-42a7b54dc074)

<br>

### 1.2. チャージコマンドとチャージタイム

![image](https://github.com/user-attachments/assets/85883d99-6134-4aa7-9d35-69b8b98b26f7)

<br>

チャージ武器を装備しているユニットは、コマンド「**チャージ（名称は任意で設定可能）**」 を使用できるようになります。

<br>

![image](https://github.com/user-attachments/assets/26ae415b-66dc-4b53-8ca4-f3d350623cc7)

<br>

チャージを使用するとユニットが**チャージ状態**になり、  
そのアタックターンの終了時に基本 WT 値の代わりに武器毎に設定した**チャージタイム(CT)** の値が WT 値に加算されます。

例えば、

-   クラスの WT 値が 100
-   速さが 6
-   武器の重さが 5
-   武器の CT が 30

のユニットがいた場合、行動終了時に通常なら基本 WT 値 99 が加算されますが、  
チャージ使用時は代わりに 30 が加算されます。

<br>

### 1.3. チャージ状態のときにできること

チャージ状態のユニットは使用できるコマンドが制限されます。

具体的には、以下の 3 つ以外のコマンドが使用できなくなります。

-   攻撃
-   チャージ解除（チャージ状態のときのみ出現するコマンド。名称は任意で設定可能）
-   待機

<br>

![image](https://github.com/user-attachments/assets/7ab18065-0914-4801-8234-70e097476e4f)

<br>

また、チャージ状態のときは移動ができなくなります。

<br>

![image](https://github.com/user-attachments/assets/2f235968-45d8-46c5-bde0-b0eb115902d0)

<br>

### 1.4. チャージ武器で攻撃する条件

チャージ武器装備中は以下の条件を全て満たさない限り攻撃ができません。

-   チャージ状態である
-   チャージ使用時に加算されたチャージタイムが全て消費されている

これは他のユニットから戦闘を仕掛けられた場合も同様で、  
反撃ができず一方的に攻撃されてしまいます。

<br>

![image](https://github.com/user-attachments/assets/61d89c48-9c52-4e9b-9db0-f9c8a5cb3eb1)

<br>

### 1.5. チャージ解除

チャージ状態はチャージ解除のコマンドを使用することで解除できます。

<br>

![image](https://github.com/user-attachments/assets/84ed60e6-0c23-457b-8500-3813d8f9c434)

<br>

また、アイテム交換などでチャージ使用時の武器とは別の武器に持ち替えられたり、  
武器自体が所持アイテムから失われたりした場合、チャージ状態は自動的に解除されます。

<br>

![image](https://github.com/user-attachments/assets/3f18f02f-98b7-461d-b46a-b57c251cd00c)

![image](https://github.com/user-attachments/assets/750f0cb8-3222-43fb-867e-c31dca916255)

<br>

### 1.6. 攻撃時の武器選択

チャージ状態で攻撃コマンドを使用したとき、武器選択画面はスキップされます。

<br>

![gif](https://github.com/user-attachments/assets/b4e5d38a-ec7c-48d7-b519-403571925fe5)

<br>

### 1.7. チャージの種別

チャージコマンドの名称やコマンド選択時の確認メッセージなどは複数種類設定することができます。

例えば、弓はコマンドの名称を「チャージ」と「解除」にし、  
魔法は「詠唱」と「詠唱中断」にする、という風に設定できます。

<br>

![image](https://github.com/user-attachments/assets/259d1f41-2e8c-4c91-9b82-e56ee2b2d937)

![image](https://github.com/user-attachments/assets/6f200c59-23a8-40b4-a80d-691f0caa151a)

<br>

## 2. 導入手順

### 2.1. ファイルを Plugin フォルダ配下に保存する

ChargeWeapon.js をプロジェクトの Plugin フォルダ配下に保存してください。

<br>

### 2.2. スクリプト内の変数の設定

![image](https://github.com/user-attachments/assets/121ad116-8ecc-4620-b5f6-186dd87975d5)

<br>

WaitTurnSystem.js 内の設定項目を必要に応じて変更してください。

<br>

![image](https://github.com/user-attachments/assets/60454e09-83ea-4e6d-ae38-30b933f02957)

<br>

以下の 6 つの変数は、チャージの種別ごとにコマンドの名称や確認メッセージを設定するために使用します。

-   ChargeStateId
-   ChargeCommandNameString
-   ChargeReleaseCommandNameString
-   ChargeCommandMessageString
-   ChargeReleaseCommandMessageString
-   ChargeItemSentenceString

<br>

デフォルトでは 2 種類用意されており、次項で武器のカスタムパラメータ chargeType に  
"**charge**"を設定すると「charge:」の右側の値が、"**magic**"を設定すると「magic:」の右側の値がそれぞれ適用されます。

<br>

新しい種別を追加したい場合、以下のように追記します。

```
// チャージステートのID
var ChargeStateId = {
    charge: 6, // chargeType:"charge"
    magic: 7, // chargeType:"magic" 末尾にカンマを追記する
    drawBow: 8 // chargeType:"drawBow" 新しく追加した種別
};

// チャージコマンドの名称
var ChargeCommandNameString = {
    charge: "チャージ", // chargeType:"charge"
    magic: "詠唱", // chargeType:"magic" 末尾にカンマを追記する
    drawBow: "弓を引き絞る" // chargeType:"drawBow" // 新しく追加した種別
};

// 以下同様
```

この場合、chargeType を"**drawBow**"にすると新しく追加した設定が適用されます。

<br>

### 2.3. 武器のカスタムパラメータの設定

![image](https://github.com/user-attachments/assets/0ab2b3e2-97d3-48c9-8292-468a0a02d679)

<br>

チャージ武器にしたい武器のカスタムパラメータに以下を設定します。

```
{
    chargeType: チャージの種別,
    chargeWT: チャージタイムの値
}
```

例えば、チャージの種別を"drawBow"、チャージタイムを 30 に設定したい場合は次のように入力します。

```
{
    chargeType: "drawBow",
    chargeWT: 30
}
```

<br>

### 2.4. ステートの設定

![image](https://github.com/user-attachments/assets/34442148-1491-4522-ad67-686ac6538ee4)

![image](https://github.com/user-attachments/assets/f9938928-7fbc-4407-8b4f-88866e1082c7)

<br>

チャージ状態であることを示すステートをチャージの種別ごとに設定します。  
ステートを作成し、以下の項目を設定してください。

-   「バッドステートとして扱う」のチェックを外す
-   マップアニメに任意のアニメーションを設定する
-   カスタムパラメータに以下を設定する

```
{
    isChargeState: true
}
```

このとき、ステートの ID が **2.2 スクリプト内の変数の設定** で設定した ChargeStateId の値と対応するようにしてください。

<br>

以上で基本設定は完了となります。

<br>

## 3. 追加設定

### 3.1. 自軍以外のユニットのカスタムパラメータの設定

![image](https://github.com/user-attachments/assets/cb94aa0f-4739-4852-a56f-222e92f7d1d4)

<br>

自軍以外のユニットにチャージ武器を使用させたい場合、カスタムパラメータに以下を設定します。

```
{
    isChargeKept: true // チャージ状態時に攻撃可能な相手がいないとき、チャージ状態を維持させたい場合はtrue、解除させたいならfalse
}
```

<br>

自軍以外のユニットは、チャージ武器を使用する際に以下のルールに従って行動します。

-   攻撃可能な相手がいるとき、チャージ状態でなければチャージ武器の射程内に入るまで移動してチャージを使用する
-   攻撃可能な相手がいるとき、チャージ状態であれば攻撃する
-   チャージ状態だが攻撃可能な相手がいないとき、カスタムパラメータ isChargeKept の設定に従って「チャージ状態を維持して待機する」「チャージ状態を解除する」のいずれかを行う

<br>

### 3.2. 独自のユニットコマンドを導入しているときの設定

チャージ状態のユニットは「攻撃」「チャージ解除」「待機」以外のコマンドが表示されない仕様になっていますが、  
他のプラグインで独自のユニットコマンドを導入している場合、別途設定を行う必要があります。

<br>

該当するプラグイン内にある isCommandDisplayable という関数を探し、  
その関数内の冒頭に以下のように記述を追加してください。
（isCommandDisplayable がない場合は設定不要です）

```
isCommandDisplayable: function () {
    // ここから
    if (!this.isCommandDisplayableWithChargeState(this.getCommandTarget())) {
        return false;
    }
    // ここまでが追記する内容

    // 以降、従来の処理
},
```

<br>
