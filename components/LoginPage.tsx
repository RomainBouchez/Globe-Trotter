import React, { useState } from 'react';

const TEXT_QUESTIONS = [
  {
    question: "What is our nickname?",
    answers: ["pookie", "bebe", "pookie bebe"],
    placeholder: "Type your answer...",
  },
  {
    question: "Where did we meet?",
    answers: ["amsterdam"],
    placeholder: "Type the city...",
  },
];

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function isCorrect(input: string, accepted: string[]) {
  const n = normalize(input);
  return accepted.some((a) => normalize(a) === n);
}

interface LoginPageProps {
  onSuccess: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [valentineAnswer, setValentineAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>(TEXT_QUESTIONS.map(() => ''));
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleChange = (idx: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
    if (error) setError(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valentineOk = valentineAnswer !== null;
    const textOk = TEXT_QUESTIONS.every((q, i) => isCorrect(answers[i], q.answers));
    if (valentineOk && textOk) {
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-deep)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Fredoka', sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-card)',
          padding: '48px 40px',
          maxWidth: '460px',
          width: '90%',
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          animation: shake ? 'shakeX 0.5s ease-in-out' : 'fadeInUp 0.8s var(--ease-out)',
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            fontSize: '28px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '8px',
            marginTop: 0,
          }}
        >
          Pour Mika
        </h1>
        <p
          style={{
            textAlign: 'center',
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '36px',
            marginTop: 0,
          }}
        >
          Quelques questions avant d'entrer
        </p>

        {/* Question 1: Valentine buttons */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontWeight: 500,
              marginBottom: '12px',
            }}
          >
            Do you want to be my Valentine?
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {(['yes', 'red'] as const).map((val, i) => {
              const selected = valentineAnswer === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => { setValentineAnswer(val); if (error) setError(false); }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-btn)',
                    border: selected ? '1.5px solid var(--accent)' : '1.5px solid var(--border-dim)',
                    background: selected ? 'oklch(72% 0.13 55 / 0.12)' : 'var(--bg-deep)',
                    color: 'var(--text-primary)',
                    fontSize: '15px',
                    fontFamily: "'Fredoka', sans-serif",
                    cursor: 'pointer',
                    transition: 'all 220ms var(--ease-out)',
                    boxShadow: selected ? '0 0 16px var(--accent-dim)' : 'none',
                  }}
                >
                  {i === 0 ? 'Yes' : 'Yes but in red'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Text questions */}
        {TEXT_QUESTIONS.map((q, idx) => (
          <div key={idx} style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                color: 'var(--text-primary)',
                fontSize: '15px',
                fontWeight: 500,
                marginBottom: '8px',
              }}
            >
              {q.question}
            </label>
            <input
              type="text"
              value={answers[idx]}
              onChange={(e) => handleChange(idx, e.target.value)}
              placeholder={q.placeholder}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-btn)',
                border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border-subtle)'}`,
                background: 'var(--bg-deep)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                fontFamily: "'Fredoka', sans-serif",
                outline: 'none',
                transition: 'border-color 220ms var(--ease-out)',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border-subtle)'; }}
            />
          </div>
        ))}

        {error && (
          <p
            style={{
              color: 'oklch(70% 0.12 25)',
              fontSize: '13px',
              textAlign: 'center',
              marginBottom: '16px',
            }}
          >
            Hmm, pas tout à fait…
          </p>
        )}

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 'var(--radius-btn)',
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--accent-text)',
            fontSize: '16px',
            fontWeight: 600,
            fontFamily: "'Fredoka', sans-serif",
            cursor: 'pointer',
            transition: 'transform 220ms var(--ease-out), box-shadow 220ms var(--ease-out)',
            boxShadow: '0 4px 20px var(--accent-dim)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget).style.transform = 'scale(1.02)';
            (e.currentTarget).style.boxShadow = '0 6px 28px var(--accent-dim)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget).style.transform = 'scale(1)';
            (e.currentTarget).style.boxShadow = '0 4px 20px var(--accent-dim)';
          }}
        >
          Entrer
        </button>
      </form>
    </div>
  );
}
