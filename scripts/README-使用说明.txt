CardZero 黑色五叶草卡名补全工具
================================

这份工具根据你已经下载完成的 manifest：

data/download-manifests/black-clover.images.json
data/download-manifests/black-clover-2.images.json

读取官方卡图的 alt 文字，例如：

UA20BT/BCV-1-001 メギキュラ

然后自动：

1. 生成 data/raw-card-data/black-clover.json
2. 补全 data/card-series-generated/black-clover.ts 的日文卡名
3. 同一个卡号的普通版、异图版会一起补上相同卡名
4. 自动识别 AP 卡
5. 先备份原来的 black-clover.ts
6. 产生匹配报告

安装
----

把 enrich-black-clover-cards.mjs 放到：

D:\CardZero\cardzero\scripts\

覆盖你现在的空白文件。

执行
----

node --check .\scripts\enrich-black-clover-cards.mjs

node .\scripts\enrich-black-clover-cards.mjs

完成后检查
----------

node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('./data/raw-card-data/black-clover.json','utf8').replace(/^\uFEFF/,''));console.log('独立卡号:',d.length);console.log(d[0]);"

然后本地运行：

npm run dev

打开：

http://localhost:3000/card?series=黑色五叶草

重要说明
--------

你上传的原下载器只把：

- alt
- sourceUrl
- localPath
- sizeBytes

写入 manifest。

所以这一步可以可靠补入：

- 卡号
- 日文卡名
- 系列
- 图片
- 官方列表网址

但 manifest 本身没有：

- 颜色
- 卡牌类型
- 稀有度
- 费用
- AP
- BP
- 特征
- 效果
- Trigger

这些资料不能从现有 manifest 凭空恢复，下一阶段需要另外读取卡牌详情来源。
