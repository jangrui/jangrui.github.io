# brew 更换清华大学镜像源

## 首次安装 Homebrew

对于 macOS 用户需额外要求安装 Command Line Tools (CLT) for Xcode。

```bash
xcode-select --install
```

接着，在终端输入以下几行命令设置环境变量：

```bash
export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git"
export HOMEBREW_CORE_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git"
export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles"
```

最后，在终端运行以下命令以安装 Homebrew：

```bash
git clone --depth=1 https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/install.git brew-install
/bin/bash brew-install/install.sh
rm -rf brew-install
```

> 也可从 GitHub 获取官方安装脚本安装 Homebrew / Linuxbrew

```bash
/bin/bash -c "$(curl -fsSL https://github.com/Homebrew/install/raw/master/install.sh)"
```

## 替换现有仓库上游

```bash
sed -i '/HOMEBREW_BREW_GIT_REMOTE/d' ~/.zshrc ~/.bashrc ~/.bash_profile
sed -i '/HOMEBREW_CORE_GIT_REMOTE/d' ~/.zshrc ~/.bashrc ~/.bash_profile
sed -i '/HOMEBREW_BOTTLE_DOMAIN/d' ~/.zshrc ~/.bashrc ~/.bash_profile

cat > ~/.zshrc <<-'EOF'
export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git"
export HOMEBREW_CORE_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git"
export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles"
EOF

brew tap --custom-remote --force-auto-update homebrew/core https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git
brew tap --custom-remote --force-auto-update homebrew/cask https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-cask.git
brew tap --custom-remote --force-auto-update homebrew/cask-fonts https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-cask-fonts.git
brew tap --custom-remote --force-auto-update homebrew/cask-drivers https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-cask-drivers.git
brew tap --custom-remote --force-auto-update homebrew/cask-versions https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-cask-versions.git
brew tap --custom-remote --force-auto-update homebrew/command-not-found https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-command-not-found.git

brew update
```

## 复原仓库上游

```bash
sed -i '/HOMEBREW_BREW_GIT_REMOTE/d' ~/.zshrc ~/.bashrc ~/.bash_profile
sed -i '/HOMEBREW_CORE_GIT_REMOTE/d' ~/.zshrc ~/.bashrc ~/.bash_profile
sed -i '/HOMEBREW_BOTTLE_DOMAIN/d' ~/.zshrc ~/.bashrc ~/.bash_profile

unset HOMEBREW_BREW_GIT_REMOTE
git -C "$(brew --repo)" remote set-url origin https://github.com/Homebrew/brew

# 以下针对 macOS 系统上的 Homebrew
unset HOMEBREW_CORE_GIT_REMOTE
BREW_TAPS="$(BREW_TAPS="$(brew tap 2>/dev/null)"; echo -n "${BREW_TAPS//$'\n'/:}")"
for tap in core cask{,-fonts,-drivers,-versions} command-not-found; do
    if [[ ":${BREW_TAPS}:" == *":homebrew/${tap}:"* ]]; then  # 只复原已安装的 Tap
        brew tap --custom-remote "homebrew/${tap}" "https://github.com/Homebrew/homebrew-${tap}"
    fi
done

brew update
```
