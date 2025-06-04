#!/bin/bash

# =============================================================================
# SRPG Studio Plugin Deploy Script
# プラグインをテストプロジェクトにデプロイするスクリプト
# =============================================================================

# 設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PLUGIN_SOURCE_DIR="$PROJECT_ROOT/Plugin"
TEST_PROJECTS_BASE_DIR="/mnt/d/dev/SRPG_Studio/project" # 必要に応じて変更

# 色付きログ用の定数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${CYAN}[DEBUG]${NC} $1"
}

# バナー表示
show_banner() {
    echo -e "${CYAN}"
    echo "============================================="
    echo "  SRPG Studio Plugin Deploy Script"
    echo "============================================="
    echo -e "${NC}"
}

# 利用可能なプラグイン名を取得する関数（補完用）
get_available_plugins() {
    local plugins=()
    if [ -d "$PLUGIN_SOURCE_DIR" ]; then
        for plugin_dir in "$PLUGIN_SOURCE_DIR"/*/; do
            if [ -d "$plugin_dir" ]; then
                local plugin_name=$(basename "$plugin_dir")
                plugins+=("$plugin_name")
            fi
        done
    fi
    echo "${plugins[@]}"
}

# 設定情報を表示
show_config() {
    log_info "現在の設定:"
    echo "  プラグインソース: $PLUGIN_SOURCE_DIR"
    echo "  テストプロジェクト: $TEST_PROJECTS_BASE_DIR"
    echo "  スクリプト位置: $SCRIPT_DIR"
}

# 特定のプラグインをデプロイする関数
deploy_plugin() {
    local plugin_name="$1"
    local source_dir="$PLUGIN_SOURCE_DIR/$plugin_name"
    local target_project_dir="$TEST_PROJECTS_BASE_DIR/$plugin_name"
    local target_plugin_dir="$target_project_dir/Plugin"
    
    log_info "デプロイ開始: $plugin_name"
    
    # ソースディレクトリの存在確認
    if [ ! -d "$source_dir" ]; then
        log_error "プラグインディレクトリが見つかりません: $source_dir"
        return 1
    fi
    
    # テストプロジェクトディレクトリの存在確認
    if [ ! -d "$target_project_dir" ]; then
        log_error "テストプロジェクトが見つかりません: $target_project_dir"
        log_info "テストプロジェクトを作成してください: $target_project_dir"
        return 1
    fi
    
    # Pluginディレクトリの作成
    if [ ! -d "$target_plugin_dir" ]; then
        log_info "Pluginディレクトリを作成: $target_plugin_dir"
        mkdir -p "$target_plugin_dir"
    fi
    
    local copied_files=0
    
    # JavaScriptファイルをコピー
    local js_files=("$source_dir"/*.js)
    if [ -f "${js_files[0]}" ]; then
        for js_file in "${js_files[@]}"; do
            if [ -f "$js_file" ]; then
                local filename=$(basename "$js_file")
                cp "$js_file" "$target_plugin_dir/"
                log_success "  ✓ $filename をコピーしました"
                copied_files=$((copied_files + 1))
            fi
        done
    else
        log_warning "  JavaScriptファイルが見つかりません"
    fi
    
    # READMEファイルをコピー（存在する場合）
    if [ -f "$source_dir/README.md" ]; then
        cp "$source_dir/README.md" "$target_plugin_dir/"
        log_success "  ✓ README.md をコピーしました"
        copied_files=$((copied_files + 1))
    fi
    
    # リソースファイルのコピー（Image系ディレクトリ）
    for resource_dir in "$source_dir"/*Image*; do
        if [ -d "$resource_dir" ]; then
            local resource_dir_name=$(basename "$resource_dir")
            cp -r "$resource_dir" "$target_plugin_dir/"
            log_success "  ✓ $resource_dir_name/ ディレクトリをコピーしました"
            copied_files=$((copied_files + 1))
        fi
    done
    
    if [ $copied_files -eq 0 ]; then
        log_warning "$plugin_name: コピーできるファイルが見つかりませんでした"
        return 1
    fi
    
    log_success "$plugin_name のデプロイが完了しました ($copied_files ファイル/ディレクトリ)"
    return 0
}

# 全プラグインを自動デプロイする関数
deploy_all_plugins() {
    show_banner
    log_info "全プラグインの自動デプロイを開始..."
    
    local success_count=0
    local total_count=0
    local failed_plugins=()
    
    for plugin_dir in "$PLUGIN_SOURCE_DIR"/*/; do
        if [ -d "$plugin_dir" ]; then
            local plugin_name=$(basename "$plugin_dir")
            total_count=$((total_count + 1))
            
            echo
            if deploy_plugin "$plugin_name"; then
                success_count=$((success_count + 1))
            else
                failed_plugins+=("$plugin_name")
            fi
        fi
    done
    
    echo
    echo "============================================="
    log_info "デプロイ結果: $success_count/$total_count プラグインが正常にデプロイされました"
    
    if [ ${#failed_plugins[@]} -gt 0 ]; then
        log_warning "失敗したプラグイン:"
        for failed in "${failed_plugins[@]}"; do
            echo "  - $failed"
        done
    fi
    echo "============================================="
}

# 補完機能のセットアップ
setup_completion() {
    local completion_script="$SCRIPT_DIR/deploy-plugin-completion.bash"
    
    log_info "Tab補完機能をセットアップしています..."
    
    # 補完スクリプトが存在しない場合は作成
    if [ ! -f "$completion_script" ]; then
        log_info "補完スクリプトを作成しています..."
        cat > "$completion_script" << 'EOF'
#!/bin/bash

# deploy-plugin.sh用のbash補完スクリプト

_deploy_plugin_completion() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    
    # スクリプトから利用可能なプラグインを取得
    local script_path="${COMP_WORDS[0]}"
    local available_plugins
    if [ -x "$script_path" ]; then
        available_plugins=$("$script_path" --list-plugins-only 2>/dev/null)
    fi
    
    # 基本オプション
    local basic_opts="all list config --help --setup-completion"
    
    # 全オプションを結合
    opts="$basic_opts $available_plugins"
    
    COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
    return 0
}

# deploy-plugin.shとdeploy-plugin（拡張子なし）の両方に対応
complete -F _deploy_plugin_completion deploy-plugin.sh
complete -F _deploy_plugin_completion deploy-plugin
EOF
        log_success "補完スクリプトを作成しました: $completion_script"
    fi
    
    echo
    log_info "Tab補完機能を有効にするには、以下のコマンドを実行してください:"
    echo -e "${CYAN}  source $completion_script${NC}"
    echo
    log_info "永続的に有効にするには、以下を ~/.bashrc に追加してください:"
    echo -e "${CYAN}  source $completion_script${NC}"
    echo
    log_info "または、以下のエイリアスを ~/.bashrc に追加すると便利です:"
    echo -e "${CYAN}  alias deploy='$SCRIPT_DIR/deploy-plugin.sh'${NC}"
}

# 補完用のプラグイン一覧取得（内部用）
list_plugins_only() {
    get_available_plugins
}

# 使用方法を表示
show_usage() {
    show_banner
    echo "使用法:"
    echo -e "  ${CYAN}$0 all${NC}                    # 全プラグインをデプロイ"
    echo -e "  ${CYAN}$0 <plugin_name>${NC}          # 特定のプラグインをデプロイ"
    echo -e "  ${CYAN}$0 list${NC}                   # 利用可能なプラグイン一覧を表示"
    echo -e "  ${CYAN}$0 config${NC}                 # 現在の設定を表示"
    echo -e "  ${CYAN}$0 --setup-completion${NC}     # Tab補完機能をセットアップ"
    echo
    echo "利用可能なプラグイン:"
    local plugins=($(get_available_plugins))
    if [ ${#plugins[@]} -eq 0 ]; then
        echo "  (プラグインが見つかりません)"
    else
        for plugin in "${plugins[@]}"; do
            echo "  - $plugin"
        done
    fi
    echo
    echo "設定:"
    show_config
}

# メイン処理
main() {
    # 内部用オプションの処理
    case "$1" in
        "--list-plugins-only")
            list_plugins_only
            exit 0
            ;;
    esac
    
    # 引数の確認
    if [ $# -eq 0 ]; then
        show_usage
        exit 1
    fi
    
    case "$1" in
        "all")
            deploy_all_plugins
            ;;
        "list")
            log_info "利用可能なプラグイン:"
            local plugins=($(get_available_plugins))
            if [ ${#plugins[@]} -eq 0 ]; then
                echo "  (プラグインが見つかりません)"
            else
                for plugin in "${plugins[@]}"; do
                    echo "  - $plugin"
                done
            fi
            ;;
        "config")
            show_config
            ;;
        "--setup-completion")
            setup_completion
            ;;
        "--help"|"-h")
            show_usage
            ;;
        *)
            # プラグイン名として処理
            show_banner
            deploy_plugin "$1"
            ;;
    esac
}

# スクリプト実行
main "$@"