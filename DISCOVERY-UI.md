# Discovery controls

PIXL approved the Explore/Anime dropdown appearance on October 24, 2026 and asked that dropdowns always follow this style.

Use `createFilterMenu` from `filter-menu.mjs` for new browsing/discovery dropdowns. It shares Movies/Sports discovery-filter and discovery-options classes, with the existing rounded trigger, selected checkmark, anchored menu and keyboard behavior. Avoid introducing native select menus or a different visual design for browsing filters.

Give each control a clear accessible label. Preserve arrow-key navigation, Escape to close, selected state and focus return. Destroy menu handlers when leaving a route. Check the narrow viewport as well as desktop.

Explore's Browse, anime Type/Sort, manga Format/Sort and book Genre controls use this shared component. Existing Movies and Sports controls retain their matching appearance.

Release 38 also uses the same component for manga Language/Audience filters and chapter-language selection. Adult/Teen labels refer to publication demographics. Catalog language filters check actual chapter feeds; chapter language menus show actual source editions rather than promising automatic translation.
