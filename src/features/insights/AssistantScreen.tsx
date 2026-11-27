import { MessageSquarePlus, Send } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { api, ApiError } from "@/shared/lib/api";
import { useMe } from "@/shared/lib/session";
import { Button, IconButton } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Field";
import { LogoMark } from "@/shared/ui/Logo";
import { Alert, Empty } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";
import { colors } from "@/theme/tokens";
import { AGENTS, canUseAssistant, type AgentKey } from "./agents";

type Msg = { role: "user" | "assistant"; content: string };

export function AssistantScreen() {
  const t = useT();
  const me = useMe();
  const [agent, setAgent] = useState<AgentKey>("audit");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Msg>>(null);
  const placeholder = t(AGENTS.find((a) => a.key === agent)?.example ?? AGENTS[0].example);

  if (!canUseAssistant(me.role)) {
    return <Empty title={t("Xatolik yuz berdi")} hint={t("Chat faqat savol-javob — amallar tugmalar orqali")} />;
  }

  function scrollDown() {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  async function send(raw?: string) {
    const content = (raw ?? text).trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setText("");
    setBusy(true);
    setError(null);
    scrollDown();
    try {
      const res = await api<{ reply: string; agent: AgentKey }>("/agents/chat", {
        method: "POST",
        json: { agent: "auto", messages: next },
      });
      if (res.agent) setAgent(res.agent);
      setMessages([...next, { role: "assistant", content: res.reply }]);
      scrollDown();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Xatolik yuz berdi"));
      setMessages(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={88}>
      <View className="flex-row items-center gap-3 border-b border-ink-100 px-4 py-3">
        <LogoMark size={28} />
        <Txt weight="extrabold" className="flex-1 text-base text-[#32536b]" numberOfLines={1}>
          {t("TradeFlow agent suhbat")}
        </Txt>
        {messages.length > 0 ? <IconButton icon={MessageSquarePlus} label={t("Yangi suhbat")} onPress={clearChat} /> : null}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        className="flex-1 px-4"
        contentContainerClassName="grow gap-4 py-6"
        ListEmptyComponent={
          <View className="items-center px-2 py-10">
            <LogoMark size={48} />
            <Txt className="mt-4 text-center text-sm text-ink-500">{t("Savolingizni yozing")}</Txt>
            <View className="mt-6 w-full flex-row flex-wrap justify-center gap-2">
              {AGENTS.map((a) => (
                <Pressable
                  key={a.key}
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => void send(t(a.example))}
                  className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 active:bg-white"
                  testID={`assistant-chip-${a.key}`}
                >
                  <Txt weight="medium" className="text-xs text-ink-700">
                    {t(a.example)}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View className={`flex-row ${item.role === "user" ? "justify-end" : "justify-start"}`}>
            {item.role === "assistant" ? (
              <View className="mr-2 mt-1">
                <LogoMark size={20} />
              </View>
            ) : null}
            <View className={`max-w-[88%] rounded-2xl px-4 py-3 ${item.role === "user" ? "rounded-br-md bg-[#32536b]" : "rounded-bl-md bg-ink-50"}`}>
              <Txt className={`text-sm leading-5 ${item.role === "user" ? "text-white" : "text-ink-900"}`}>{item.content}</Txt>
            </View>
          </View>
        )}
        ListFooterComponent={
          busy ? (
            <View className="flex-row items-center gap-2 py-2">
              <ActivityIndicator size="small" color={colors.brand[600]} />
              <Txt className="text-sm text-ink-500">{t("Ma'lumot olinmoqda…")}</Txt>
            </View>
          ) : undefined
        }
        onContentSizeChange={() => scrollDown()}
      />

      <View className="border-t border-ink-100 px-4 py-3">
        {error ? (
          <View className="mb-2">
            <Alert>{error}</Alert>
          </View>
        ) : null}
        <View className="flex-row items-end gap-2">
          <Input
            className="min-h-[52px] flex-1"
            multiline
            value={text}
            editable={!busy}
            placeholder={placeholder}
            onChangeText={setText}
            testID="assistant-input"
          />
          <Button
            className="h-[52px] shrink-0"
            icon={Send}
            loading={busy}
            disabled={busy || !text.trim()}
            onPress={() => void send()}
            testID="assistant-send"
          >
            {t("Yuborish")}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
