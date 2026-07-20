# DeckSubmissionForm.tsx 整合方式

加入：

```tsx
import DeckImagePicker from "./DeckImagePicker";
import {
  deckImageOptionsBySeries,
} from "../data/deck-image-options";
```

判断该系列是否有 Excel 设定：

```tsx
const hasImageDeckOptions =
  (
    deckImageOptionsBySeries[
      resolvedSeries
    ] ?? []
  ).some(
    (option) =>
      option.enabled !== false,
  );
```

在「对应牌组」区域：

```tsx
{hasImageDeckOptions ? (
  <DeckImagePicker
    series={resolvedSeries}
    cards={
      cardsBySeries[
        resolvedSeries
      ] ?? []
    }
    selectedDeck={
      selectedDeck
    }
    onSelect={(deckName) => {
      setSelectedDeck(deckName);
      setCustomDeckName("");
    }}
    onCustom={() =>
      setSelectedDeck(
        CUSTOM_DECK_VALUE,
      )
    }
    customSelected={
      usingCustomDeck
    }
  />
) : (
  // 保留原本的牌组 select
)}
```

`app/submit/page.tsx` 必须继续传入：

```tsx
cardsBySeries={cardsBySeries}
```
