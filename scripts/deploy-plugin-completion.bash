#!/bin/bash

# =============================================================================
# SRPG Studio Plugin Deploy Script - Bash Completion
# deploy-plugin.sh用のTab補完スクリプト
# =============================================================================

_deploy_plugin_completion() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    
    # コマンドラインの位置に応じた補完
    case $COMP_CWORD in
        1)
            # 第1引数：プラグイン名または特殊コマンド
            local script_path="${COMP_WORDS[0]}"
            local available_plugins
            
            # スクリプトの実際のパスを取得
            local actual_path="$script_path"
            
            # エイリアスの場合は実際のパスを取得
            if alias "$script_path" >/dev/null 2>&1; then
                actual_path=$(alias "$script_path" | sed "s/alias $script_path='//;s/'$//")
            elif ! command -v "$script_path" >/dev/null 2>&1; then
                # コマンドが見つからない場合のフォールバック
                # deploy-plugin.sh or deploy-plugin-completion.bash がある場所から推測
                local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
                local fallback_path="$script_dir/deploy-plugin.sh"
                if [ -x "$fallback_path" ]; then
                    actual_path="$fallback_path"
                fi
            fi
            
            # スクリプトから利用可能なプラグインを取得
            if [ -x "$actual_path" ]; then
                available_plugins=$("$actual_path" --list-plugins-only 2>/dev/null)
            fi
            
            # 基本オプション
            local basic_opts="all list config --help --setup-completion"
            
            # 全オプションを結合
            opts="$basic_opts $available_plugins"
            ;;
        *)
            # 第2引数以降は補完しない
            return 0
            ;;
    esac
    
    COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
    return 0
}

# deploy-plugin.shとdeploy-plugin（拡張子なし）の両方に対応
complete -F _deploy_plugin_completion deploy-plugin.sh
complete -F _deploy_plugin_completion deploy-plugin

# エイリアスが設定されている場合も対応
complete -F _deploy_plugin_completion deploy