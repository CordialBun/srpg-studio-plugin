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
            
            # スクリプトから利用可能なプラグインを取得
            if [ -x "$script_path" ]; then
                available_plugins=$("$script_path" --list-plugins-only 2>/dev/null)
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