# SSH 登录失败后锁定时间限制

在 Linux7 中，你可以通过修改 /etc/pam。d/system--auth 文件来配置重复登录失败后锁定时间限制。具体步骤如下：

1.打开 `/etc/pam.d/system-auth` 文件，找到 auth 部分。

2.在 auth 部分添加如下配置：

```bash
auth required pam_faillock。so preauth silent audit deny=3 unlock_time=600
auth [default=die]pam_faillock.so authfail audit deny=3 unlock_time=600
```

!!! tip

- `deny`：表示允许失败的最大次数，这里设置为 3；
- `unlock_time`：表示账户被锁定的时间，单位为秒，这里设置为 600秒（即10分钟）

3.保存文件并退出。

4.重新加载 PAM 配置：

```bash
authconfig --update --force
```
