import { X } from "lucide-react-native";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "@/shared/i18n/I18nProvider";
import { IconButton } from "./Button";
import { Txt } from "./Txt";

/** Bottom sheet: forms and pickers. `scroll={false}` when the child is a FlatList. */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  scroll = true,
  tall = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  scroll?: boolean;
  tall?: boolean;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} accessibilityLabel={t("Yopish")} />
        <View className={`rounded-t-shell bg-white ${tall ? "h-[88%]" : "max-h-[90%]"}`} style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <View className="items-center pt-2">
            <View className="h-1 w-10 rounded-full bg-ink-200" />
          </View>
          <View className="flex-row items-start gap-3 px-5 pb-3 pt-2">
            <View className="flex-1">
              <Txt weight="extrabold" className="text-lg">
                {title}
              </Txt>
              {description ? <Txt className="mt-0.5 text-sm text-ink-500">{description}</Txt> : null}
            </View>
            <IconButton icon={X} label={t("Yopish")} onPress={onClose} />
          </View>
          {scroll ? (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-4 gap-4">
              {children}
            </ScrollView>
          ) : (
            <View className={tall ? "flex-1" : ""}>{children}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
