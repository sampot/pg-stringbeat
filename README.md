# 琴弦節拍 (`pg-stringbeat`)

四軌琴弦節奏遊戲：音符抵達判定線時，用 A／S／D／F 或觸控撥動 E／A／D／G 四弦。

類型：**樂器節奏** · 系列建議：街機

## 遊玩

純 HTML／CSS／JavaScript（無 build）。本機以靜態伺服器開啟，或經 Playgrounds／go 安裝。

- 三首譜面、初學／熟手／名手三種難度
- PERFECT／GREAT／GOOD／MISS 判定、連擊倍率、長音與弦況
- 曲終準度達難度門檻且弦況未歸零即過關
- 每首歌／難度的最佳成績會寫入 Playgrounds KV

## 開發

```bash
npx vitest run
```

## 署名

見 [ATTRIBUTION.md](./ATTRIBUTION.md)。
