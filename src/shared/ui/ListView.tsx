import { Plus, type LucideIcon } from "lucide-react-native";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from "react-native";
import type { Paged } from "@/shared/lib/usePaged";
import { colors, shadows } from "@/theme/tokens";
import { Empty, ErrorState, Loading } from "./States";

/** Infinite, pull-to-refresh list bound to `usePaged`. */
export function ListView<T>({
  list,
  renderItem,
  keyOf,
  header,
  emptyTitle,
  emptyHint,
}: {
  list: Paged<T, any>;
  renderItem: (item: T) => React.ReactElement;
  keyOf: (item: T) => string | number;
  header?: React.ReactElement;
  emptyTitle: string;
  emptyHint?: string;
}) {
  return (
    <FlatList
      data={list.error ? [] : (list.items as T[])}
      keyExtractor={(i) => String(keyOf(i))}
      renderItem={({ item }) => renderItem(item)}
      ListHeaderComponent={header ? <View className="pb-1">{header}</View> : undefined}
      contentContainerClassName="gap-3 pb-28"
      keyboardShouldPersistTaps="handled"
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} colors={[colors.brand[600]]} tintColor={colors.brand[600]} />}
      ListEmptyComponent={list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading ? <Loading /> : <Empty title={emptyTitle} hint={emptyHint} />}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator className="py-4" color={colors.brand[600]} /> : undefined}
    />
  );
}

export function ItemWrap({ children }: { children: React.ReactNode }) {
  return <View className="px-4">{children}</View>;
}

export function Fab({ onPress, label, icon: Icon = Plus }: { onPress: () => void; label: string; icon?: LucideIcon }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID="fab"
      onPress={onPress}
      className="absolute right-5 size-14 items-center justify-center rounded-full bg-brand-600 active:bg-brand-700"
      style={[shadows.lift, { bottom: 20 }]}
    >
      <Icon size={26} color="#ffffff" />
    </Pressable>
  );
}
