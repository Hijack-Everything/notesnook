/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
import { Notebook, VirtualizedGrouping } from "@notesnook/core";
import { useThemeColors } from "@notesnook/theme";
import React, { useMemo } from "react";
import { View, useWindowDimensions } from "react-native";
import { notesnook } from "../../../../e2e/test.ids";
import { useTotalNotes } from "../../../hooks/use-db-item";
import { useNotebook } from "../../../hooks/use-notebook";
import useNavigationStore from "../../../stores/use-navigation-store";
import { SIZE } from "../../../utils/size";
import { IconButton } from "../../ui/icon-button";
import { PressableButton } from "../../ui/pressable";
import Paragraph from "../../ui/typography/paragraph";
import { AddNotebookSheet } from "../add-notebook";
import {
  useNotebookExpandedStore,
  useNotebookItemSelectionStore
} from "./store";

type NotebookParentProp = {
  parent?: NotebookParentProp;
  item?: Notebook;
};

export const NotebookItem = ({
  id,
  currentLevel = 0,
  index,
  parent,
  items
}: {
  id: string;
  currentLevel?: number;
  index: number;
  parent?: NotebookParentProp;
  items?: VirtualizedGrouping<Notebook>;
}) => {
  const { nestedNotebooks, notebook: item } = useNotebook(id, items);
  const ids = useMemo(() => (id ? [id] : []), [id]);
  const { totalNotes: totalNotes } = useTotalNotes(ids, "notebook");
  const focusedRouteId = useNavigationStore((state) => state.focusedRouteId);
  const { colors } = useThemeColors("sheet");
  const selection = useNotebookItemSelectionStore((state) =>
    id ? state.selection[id] : undefined
  );
  const isSelected = selection === "selected";
  const isFocused = focusedRouteId === id;
  const { fontScale } = useWindowDimensions();
  const expanded = useNotebookExpandedStore((state) => state.expanded[id]);

  const onPress = () => {
    if (!item) return;
    const state = useNotebookItemSelectionStore.getState();

    if (isSelected) {
      state.markAs(item, !state.initialState[id] ? undefined : "deselected");
      return;
    }

    if (!state.multiSelect) {
      const keys = Object.keys(state.selection);
      const nextState: any = {};
      for (const key in keys) {
        nextState[key] = !state.initialState[key] ? undefined : "deselected";
      }
      console.log("Single item selection");
      state.setSelection({
        [item.id]: "selected",
        ...nextState
      });
    } else {
      console.log("Multi item selection");
      state.markAs(item, "selected");
    }
  };

  return (
    <View
      style={{
        paddingLeft: currentLevel > 0 && currentLevel < 6 ? 15 : undefined,
        width: "100%"
      }}
    >
      <PressableButton
        type={"transparent"}
        onLongPress={() => {
          if (!item) return;
          useNotebookItemSelectionStore.setState({
            multiSelect: true
          });
          useNotebookItemSelectionStore.getState().markAs(item, "selected");
        }}
        testID={`add-to-notebook-item-${currentLevel}-${index}`}
        onPress={onPress}
        customStyle={{
          justifyContent: "space-between",
          width: "100%",
          alignItems: "center",
          flexDirection: "row",
          paddingLeft: 12,
          paddingRight: 12,
          borderRadius: 0,
          height: 45
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center"
          }}
        >
          {nestedNotebooks?.ids.length ? (
            <IconButton
              size={SIZE.xl}
              color={isSelected ? colors.selected.icon : colors.primary.icon}
              onPress={() => {
                useNotebookExpandedStore.getState().setExpanded(id);
              }}
              top={0}
              left={0}
              bottom={0}
              right={0}
              customStyle={{
                width: 35,
                height: 35
              }}
              name={expanded ? "chevron-down" : "chevron-right"}
            />
          ) : null}

          <IconButton
            size={SIZE.xl}
            color={
              isSelected
                ? colors.selected.icon
                : selection === "deselected"
                ? colors.error.accent
                : colors.primary.icon
            }
            onPress={onPress}
            top={0}
            left={0}
            bottom={0}
            right={0}
            customStyle={{
              width: 40,
              height: 40
            }}
            name={
              selection === "deselected"
                ? "close-circle-outline"
                : isSelected
                ? "check-circle-outline"
                : selection === "intermediate"
                ? "minus-circle-outline"
                : "checkbox-blank-circle-outline"
            }
          />

          <Paragraph
            color={
              isFocused ? colors.selected.paragraph : colors.secondary.paragraph
            }
            size={SIZE.sm}
          >
            {item?.title}{" "}
          </Paragraph>
        </View>

        <View
          style={{
            flexDirection: "row",
            columnGap: 10,
            alignItems: "center"
          }}
        >
          {totalNotes?.(id) ? (
            <Paragraph size={SIZE.sm} color={colors.secondary.paragraph}>
              {totalNotes(id)}
            </Paragraph>
          ) : null}
          <IconButton
            name="plus"
            customStyle={{
              width: 40 * fontScale,
              height: 40 * fontScale
            }}
            testID={notesnook.ids.notebook.menu}
            onPress={() => {
              if (!item) return;
              AddNotebookSheet.present(undefined, item, "link-notebooks");
            }}
            left={0}
            right={0}
            bottom={0}
            top={0}
            color={colors.primary.icon}
            size={SIZE.xl}
          />
        </View>
      </PressableButton>

      {!expanded
        ? null
        : nestedNotebooks?.ids.map((id, index) => (
            <NotebookItem
              key={id as string}
              id={id as string}
              index={index}
              currentLevel={currentLevel + 1}
              items={nestedNotebooks}
              parent={{
                parent: parent,
                item: item
              }}
            />
          ))}
    </View>
  );
};
