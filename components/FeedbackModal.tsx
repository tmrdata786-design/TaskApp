import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { Trash2, Send } from 'lucide-react';
import { useAdmin } from '../lib/useAdmin';

export default function FeedbackModal({ taskId, taskName, onClose }: { taskId: string, taskName: string, onClose: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isAdmin } = useAdmin();

  useEffect(() => {
    const q = query(collection(db, `tasks/${taskId}/feedback`), orderBy('created_at', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const email = auth.currentUser?.email || 'Anonymous';
      const name = email.split('@')[0];
      const newDoc = doc(collection(db, `tasks/${taskId}/feedback`));
      await setDoc(newDoc, {
        text: text.trim(),
        user: name,
        created_at: new Date().toISOString()
      });
      setText('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `tasks/${taskId}/feedback`);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, `tasks/${taskId}/feedback`, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `tasks/${taskId}/feedback/${id}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#11141A] rounded-2xl border border-[#1F2937] w-full max-w-lg flex flex-col max-h-[85vh] h-[600px]">
        {/* Header */}
        <div className="p-4 border-b border-[#1F2937] flex justify-between items-center bg-[#1A1D23] rounded-t-2xl">
          <div>
            <h2 className="text-sm font-semibold text-white">Task Feedback</h2>
            <p className="text-xs text-gray-400 mt-1 truncate max-w-[300px]">{taskName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition px-2 py-1">Close</button>
        </div>

        {/* Chat window */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center text-gray-500 text-sm mt-4">Loading feedback...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm mt-4">No feedback yet. Start the conversation!</div>
          ) : (
            messages.map((m) => {
              const isCurrentUser = m.user === (auth.currentUser?.email?.split('@')[0] || 'Anonymous');
              
              return (
                <div key={m.id} className={`flex flex-col max-w-[85%] ${isCurrentUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                  <span className="text-[10px] text-gray-500 mb-1 mx-1 flex items-center gap-2">
                    {m.user} 
                    {isAdmin && (
                      <button onClick={() => deleteMessage(m.id)} className="text-red-500 hover:text-red-400"><Trash2 size={10} /></button>
                    )}
                  </span>
                  <div className={`p-3 rounded-2xl text-sm ${
                    isCurrentUser 
                      ? 'bg-indigo-600 text-white rounded-br-sm' 
                      : 'bg-[#1F2937] text-gray-200 rounded-bl-sm'
                  }`}>
                    {m.text}
                  </div>
                  <span className="text-[9px] text-gray-500 mt-1 mx-1">
                    {new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-[#1F2937] bg-[#1A1D23] rounded-b-2xl flex gap-2">
          <input 
            type="text" 
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={submitting}
            className="flex-1 bg-[#0B0D10] border border-[#2D3139] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
          />
          <button 
            type="submit" 
            disabled={submitting || !text.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition flex items-center justify-center"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
