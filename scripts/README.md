# SRPG Studio Plugin Deploy Script

プラグインをテストプロジェクトに自動デプロイするためのスクリプトです。

## 機能

- 特定のプラグインまたは全プラグインのデプロイ
- Tab補完によるプラグイン名の自動補完
- 色付きログでの分かりやすい出力
- リソースファイル（画像等）の自動コピー
- 設定表示と診断機能

## セットアップ

### 1. 実行権限の付与

```bash
chmod +x scripts/deploy-plugin.sh
```

### 2. Tab補完機能の有効化

```bash
# 補完機能をセットアップ
./scripts/deploy-plugin.sh --setup-completion

# 現在のセッションで有効化
source scripts/deploy-plugin-completion.bash
```

### 3. 永続的な設定（推奨）

`~/.bashrc`に以下を追加：

```bash
# SRPG Studio Plugin Deploy Script
source /workspaces/srpg-studio-plugin/scripts/deploy-plugin-completion.bash
alias deploy='/workspaces/srpg-studio-plugin/scripts/deploy-plugin.sh'
```

設定後、ターミナルを再起動または `source ~/.bashrc` を実行。

## 使用方法

### 基本コマンド

```bash
# 特定のプラグインをデプロイ
./scripts/deploy-plugin.sh SpeedTaker

# 全プラグインをデプロイ
./scripts/deploy-plugin.sh all

# 利用可能なプラグイン一覧を表示
./scripts/deploy-plugin.sh list

# 現在の設定を表示
./scripts/deploy-plugin.sh config

# ヘルプを表示
./scripts/deploy-plugin.sh --help
```

### Tab補完の使用例

```bash
# プラグイン名の補完
./scripts/deploy-plugin.sh Sp[Tab]     # → SpeedTaker
./scripts/deploy-plugin.sh Br[Tab]     # → BreakSystem

# 全オプションの表示
./scripts/deploy-plugin.sh [Tab][Tab]  # → all list config SpeedTaker BreakSystem ...

# エイリアス使用時（設定後）
deploy Sp[Tab]                         # → SpeedTaker
```

## 設定

### デフォルト設定

- **プラグインソース**: `/workspaces/srpg-studio-plugin/Plugin`
- **テストプロジェクト**: `$HOME/SRPGStudio/TestProjects`

### 設定変更

`scripts/deploy-plugin.sh`内の以下の行を編集：

```bash
TEST_PROJECTS_BASE_DIR="$HOME/SRPGStudio/TestProjects"  # 必要に応じて変更
```

## ディレクトリ構造

スクリプトは以下の構造を前提としています：

```
プロジェクトルート/
├── Plugin/
│   ├── SpeedTaker/
│   │   ├── SpeedTaker.js
│   │   └── README.md
│   ├── BreakSystem/
│   │   ├── BreakSystem.js
│   │   └── README.md
│   └── ...
└── scripts/
    ├── deploy-plugin.sh
    ├── deploy-plugin-completion.bash
    └── README.md

テストプロジェクト/
├── SpeedTaker/          # プラグイン名と同名
│   └── Plugin/          # ここにコピーされる
│       └── SpeedTaker.js
├── BreakSystem/
│   └── Plugin/
│       └── BreakSystem.js
└── ...
```

## 対応ファイル

以下のファイルが自動的にコピーされます：

- `*.js` - JavaScriptファイル
- `README.md` - ドキュメントファイル
- `*Image*` - 画像リソースディレクトリ

## トラブルシューティング

### テストプロジェクトが見つからない

```bash
# エラー例
[ERROR] テストプロジェクトが見つかりません: /home/user/SRPGStudio/TestProjects/SpeedTaker

# 解決方法
mkdir -p "$HOME/SRPGStudio/TestProjects/SpeedTaker"
```

### 補完が効かない

```bash
# 補完スクリプトを再読み込み
source scripts/deploy-plugin-completion.bash

# bashが補完機能をサポートしているか確認
complete -p | grep deploy-plugin
```

### 設定確認

```bash
# 現在の設定を表示
./scripts/deploy-plugin.sh config
```

## 開発者向け情報

### スクリプトの拡張

新しい機能を追加する場合は、以下の関数を参考にしてください：

- `deploy_plugin()` - 単一プラグインのデプロイ処理
- `deploy_all_plugins()` - 全プラグインのデプロイ処理
- `get_available_plugins()` - プラグイン一覧取得

### ログ関数

```bash
log_info "情報メッセージ"
log_success "成功メッセージ"
log_warning "警告メッセージ"
log_error "エラーメッセージ"
```

### カスタマイズ例

```bash
# プラグイン固有の処理を追加
deploy_plugin() {
    local plugin_name="$1"
    
    # 既存の処理...
    
    # カスタム処理
    if [ "$plugin_name" = "SpecialPlugin" ]; then
        # 特別な処理
        log_info "特別な処理を実行中..."
    fi
}
```