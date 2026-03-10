# Auto Deploy (Gitee Go -> Tencent COS)

This repository already contains:

- `.workflow/AutoDeployCOS.yml`
- `scripts/deploy-cos.js`

After enabling Gitee Go, every push to `master` can auto deploy this site to COS.

## 1. Open Gitee Go for this repo

- Repo: `https://gitee.com/kejiacha/cn`
- Entry: `服务 -> Gitee Go`
- If first time use, complete activation (phone binding may be required).

## 2. Create pipeline from existing workflow file

- Choose code view / import workflow file.
- Select `.workflow/AutoDeployCOS.yml`.
- Save pipeline.

## 3. Configure pipeline variables

Add these variables in pipeline/global params:

- `COS_SECRET_ID`
- `COS_SECRET_KEY`
- `COS_BUCKET` (example: `kejiacha-1250000000`)
- `COS_REGION` (example: `ap-guangzhou`)

## 4. COS static website settings

In Tencent COS for the same bucket:

- Enable static website hosting.
- Index document: `index.html`
- Error document: `index.html`

## 5. Test

- Run pipeline once manually.
- Visit COS static website URL.
- Next commits to `master` should trigger auto deployment.
