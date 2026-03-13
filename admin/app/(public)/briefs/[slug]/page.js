'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function BriefFormPage() {
  const params = useParams();
  const slug = params.slug || '';

  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingQuestionIdRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/briefs/${slug}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setBrief(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const questions = brief?.questions || [];
  const current = questions[step];
  const currentId = current?.id ?? current?.question_id ?? String(step);
  const currentText = current?.question_text ?? current?.question ?? current?.text ?? '';
  const value = answers[currentId] ?? '';
  const total = questions.length;
  const progressPct = total ? ((step + 1) / total) * 100 : 0;

  const startRecording = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Голосовой ввод не поддерживается в этом браузере');
      return;
    }
    setError('');
    chunksRef.current = [];
    recordingQuestionIdRef.current = currentId;
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          setIsRecording(false);
          setIsTranscribing(true);
          const qId = recordingQuestionIdRef.current;
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          try {
            const form = new FormData();
            form.append('audio', blob, 'voice.webm');
            const res = await fetch(`${API_BASE}/briefs/transcribe`, { method: 'POST', body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка транскрипции');
            if (qId && data.text?.trim()) {
              setAnswers((prev) => ({
                ...prev,
                [qId]: (prev[qId] ? prev[qId].trimEnd() + ' ' : '') + data.text.trim(),
              }));
            }
          } catch (e) {
            setError(e.message || 'Не удалось распознать речь');
          } finally {
            setIsTranscribing(false);
          }
        };
        recorder.start();
        setIsRecording(true);
      })
      .catch(() => setError('Нет доступа к микрофону'));
  }, [currentId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const goNext = useCallback(() => {
    if (step < total - 1) setStep((s) => s + 1);
  }, [step, total]);

  const submit = useCallback(async () => {
    setSending(true);
    setError('');
    try {
      const answersArray = questions.map((q) => {
        const id = q.id ?? q.question_id ?? String(questions.indexOf(q));
        return {
          question_id: id,
          question_text: q.question_text ?? q.question ?? q.text ?? '',
          answer: answers[id] ?? '',
        };
      });
      const res = await fetch(`${API_BASE}/briefs/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersArray }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка отправки');
      setDone(true);
    } catch (e) {
      setError(e.message || 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  }, [slug, answers, questions]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (step < total - 1) goNext();
      else submit();
    }
  }, [step, total, goNext, submit]);

  // --- Loading / not found ---
  if (loading) {
    return (
      <div className="w-full max-w-[760px] flex items-center justify-center py-20">
        <p className="text-[14px] text-black opacity-40">Загрузка…</p>
      </div>
    );
  }

  if (notFound || !brief) {
    return (
      <div className="w-full max-w-[760px] flex flex-col items-center gap-4 py-20">
        <p className="text-[32px] font-semibold text-[#242424]">Бриф не найден</p>
        <p className="text-[14px] text-black opacity-60">Проверьте ссылку или обратитесь к менеджеру.</p>
      </div>
    );
  }

  // --- Done ---
  if (done) {
    return (
      <div className="w-full max-w-[760px] flex flex-col items-center gap-6 py-20 text-center">
        <p className="text-[32px] font-semibold text-[#242424]">Спасибо!</p>
        <p className="text-[16px] text-black opacity-60 max-w-sm">
          Бриф отправлен. Мы свяжемся с вами в ближайшее время.
        </p>
      </div>
    );
  }

  const isLast = step === total - 1;

  return (
    <div className="w-full max-w-[760px] flex flex-col gap-[80px]">

      {/* Вопрос + прогресс */}
      <div className="flex flex-col gap-[48px] items-center w-full">
        <div className="flex flex-col gap-[16px] items-center w-full">
          {/* Надпись ВОПРОС */}
          <p className="text-[14px] tracking-[2.8px] text-black opacity-60 text-center uppercase">
            Вопрос
          </p>
          {/* Текст вопроса */}
          <h2 className="text-[32px] font-semibold text-[#242424] text-center leading-none">
            {currentText}
          </h2>
        </div>

        {/* Прогресс-бар */}
        <div className="flex flex-col gap-[12px] items-center w-full">
          <div className="relative w-full pb-[2px] flex flex-col">
            <div className="h-[2px] rounded-[8px] w-full bg-[#d9d9d9]" />
            <div
              className="h-[2px] rounded-[8px] mt-[-2px] transition-all duration-300"
              style={{
                width: `${progressPct}%`,
                background: 'linear-gradient(193deg, #ec55b8 2.9%, #db2e2e 110.3%)',
              }}
            />
          </div>
          <p className="text-[14px] tracking-[2.8px] text-black opacity-60 text-center">
            {step + 1}/{total}
          </p>
        </div>
      </div>

      {/* Карточка ответа */}
      <div className="flex flex-col gap-[40px] w-full">
        <div className="bg-white border border-[#f2f2f2] rounded-[24px] shadow-[0px_20px_100px_0px_rgba(0,0,0,0.05)] p-[20px] flex flex-col gap-[36px] w-full">

          {/* Текстовое поле */}
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent outline-none resize-none text-[14px] text-black placeholder:text-black placeholder:opacity-40 min-h-[80px]"
            placeholder={isTranscribing ? 'Распознаю речь…' : 'Ответ...'}
            value={value}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [currentId]: e.target.value }))}
            onKeyDown={handleKey}
            disabled={isTranscribing}
            rows={4}
            autoFocus
          />

          {/* Нижняя панель */}
          <div className="flex items-center justify-between">
            {/* Кнопка голоса */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className="flex items-center gap-[6px] border border-[#f2f2f2] rounded-[8px] px-[12px] py-[7px] text-[12px] text-black opacity-60 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
            >
              {isRecording ? (
                <>
                  <span className="inline-block w-[10px] h-[10px] rounded-sm bg-red-500 animate-pulse" />
                  Остановить
                </>
              ) : isTranscribing ? (
                <>
                  <span className="inline-block w-[10px] h-[10px] rounded-full border-2 border-black opacity-40 border-t-transparent animate-spin" />
                  Распознаю…
                </>
              ) : (
                <>
                  <MicIcon />
                  Записать голос
                </>
              )}
            </button>

            {/* Кнопка следующий / отправить */}
            {isLast ? (
              <button
                type="button"
                onClick={submit}
                disabled={sending}
                className="btn-gradient size-[30px] rounded-full flex items-center justify-center shrink-0 disabled:opacity-60"
                title="Отправить"
              >
                {sending ? (
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckIcon />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="btn-gradient size-[30px] rounded-full flex items-center justify-center shrink-0"
                title="Следующий вопрос"
              >
                <ArrowRightIcon />
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="text-[13px] text-red-600 text-center">{error}</p>
        )}

        <p className="text-[12px] text-black opacity-40 text-center">
          Желательно отвечать максимально развернуто. Чем больше информации, тем качественнее результат!
        </p>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="10" height="15" viewBox="0 0 10 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="0.5" width="5" height="8" rx="2.5" stroke="currentColor" />
      <path d="M1 7.5C1 9.985 2.79 12 5 12C7.21 12 9 9.985 9 7.5" stroke="currentColor" strokeLinecap="round" />
      <line x1="5" y1="12" x2="5" y2="14.5" stroke="currentColor" strokeLinecap="round" />
      <line x1="3" y1="14.5" x2="7" y2="14.5" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 7H12M12 7L7.5 2.5M12 7L7.5 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
