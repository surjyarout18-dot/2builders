import React, { useState } from 'react';
import { Sparkles, Send, X, Bot, User } from 'lucide-react';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { chatAssistantApi } from '../../services/api';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const { model, updateRoom } = useFloorPlanStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      text: "Hello! I am your Sketch2Space AI architectural assistant. Ask me questions about this floor plan's dimensions, room connections, furniture layouts, or ask me to modify materials.",
      timestamp: 'Just now'
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const quickPrompts = [
    "What is the total floor area?",
    "How many bedrooms and bathrooms are there?",
    "Recommend a furniture arrangement for the living room",
    "Change the living room floor to Carrara marble"
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputPrompt;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Check for direct conversational action commands
      const lower = query.toLowerCase();
      if (lower.includes("marble") && lower.includes("living")) {
        const floor = model.floors[0];
        const livingRoom = floor.rooms.find((r) => r.room_type === 'living_room' || r.name.toLowerCase().includes('living'));
        if (livingRoom) {
          updateRoom({ ...livingRoom, floor_material: 'tile_marble' });
        }
      }

      // Query backend API
      const res = await chatAssistantApi(model.project_id, query);
      const replyText = res.response || "I have analyzed the architectural geometry.";

      setMessages((prev) => [
        ...prev,
        {
          id: `asst_${Date.now()}`,
          sender: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      // Local fallback calculation if backend connection is unavailable
      const floor = model.floors[0];
      const totalArea = floor.rooms.reduce((acc, r) => acc + r.area_sqm, 0);
      setMessages((prev) => [
        ...prev,
        {
          id: `asst_${Date.now()}`,
          sender: 'assistant',
          text: `The active plan '${model.name}' has ${floor.rooms.length} rooms, ${floor.walls.length} walls, and a measured living area of ${totalArea.toFixed(1)} m² (${(totalArea * 10.7639).toFixed(0)} sq ft).`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-96 flex-col border-l border-[#1F2942] bg-[#111726] shadow-2xl backdrop-blur-xl">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-[#1F2942] px-4 py-3.5 bg-[#0A0D14]/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00F0FF]/10 text-[#00F0FF]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F1F5F9]">AI Design Assistant</h3>
            <p className="text-[10px] text-[#94A3B8]">Architectural Q&A & Spatial Engine</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#1F2942] hover:text-[#F1F5F9]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00F0FF]/20 text-[#00F0FF]">
                <Bot className="h-3.5 w-3.5" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-[#00F0FF] text-[#0A0D14] font-medium rounded-br-none'
                  : 'border border-[#1F2942] bg-[#161F33] text-[#F1F5F9] rounded-bl-none'
              }`}
            >
              {m.text}
              <div
                className={`mt-1 text-[9px] ${
                  m.sender === 'user' ? 'text-[#0A0D14]/70' : 'text-[#94A3B8]'
                }`}
              >
                {m.timestamp}
              </div>
            </div>
            {m.sender === 'user' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1F2942] text-[#94A3B8]">
                <User className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#00F0FF]">
            <span className="flex h-2 w-2 rounded-full bg-[#00F0FF] animate-ping" />
            <span>Analyzing architectural model...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="border-t border-[#1F2942] bg-[#0A0D14]/40 px-3 py-2">
        <div className="text-[10px] font-semibold text-[#94A3B8] mb-1.5 uppercase">Suggestions</div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              className="rounded-full border border-[#1F2942] bg-[#161F33] px-2.5 py-1 text-[11px] text-[#94A3B8] hover:border-[#00F0FF] hover:text-[#00F0FF] transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Input Box */}
      <div className="border-t border-[#1F2942] p-3 bg-[#0A0D14]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask about dimensions, rooms, finishes..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            className="flex-1 rounded-xl border border-[#1F2942] bg-[#111726] px-3.5 py-2.5 text-xs text-[#F1F5F9] focus:border-[#00F0FF] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00F0FF] text-[#0A0D14] disabled:opacity-40 hover:bg-[#00D1DF] transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
