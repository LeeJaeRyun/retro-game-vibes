import { useEffect, useRef, useState } from 'react';
import './App.css';

// Constants
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 350;
const GROUND_Y = 310;
const NET_WIDTH = 6;
const NET_HEIGHT = 110;
const NET_X = CANVAS_WIDTH / 2;
const NET_Y = GROUND_Y - NET_HEIGHT;

const PIKACHU_WIDTH = 70;
const PIKACHU_HEIGHT = 70;
const BALL_RADIUS = 15;

const GRAVITY = 0.25;
const JUMP_FORCE = -6.5;
const MOVE_SPEED = 2.5;
const BALL_MAX_SPEED = 6;
const FRICTION = 0.99;

interface Point {
  x: number;
  y: number;
}

interface Particle extends Point {
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Entity extends Point {
  vx: number;
  vy: number;
}

interface Player extends Entity {
  score: number;
  isJumping: boolean;
  isDiving: boolean;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [winner, setWinner] = useState<number | null>(null);
  
  const particlesRef = useRef<Particle[]>([]);
  const gameModeRef = useRef<'pva' | 'pvp'>('pva');
  
  const p1Img = useRef<HTMLImageElement | null>(null);
  const p2Img = useRef<HTMLImageElement | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  const p1Ref = useRef<Player>({
    x: 50,
    y: GROUND_Y - PIKACHU_HEIGHT,
    vx: 0,
    vy: 0,
    score: 0,
    isJumping: false,
    isDiving: false,
  });

  const p2Ref = useRef<Player>({
    x: CANVAS_WIDTH - 50 - PIKACHU_WIDTH,
    y: GROUND_Y - PIKACHU_HEIGHT,
    vx: 0,
    vy: 0,
    score: 0,
    isJumping: false,
    isDiving: false,
  });

  const ballRef = useRef<Entity>({
    x: 50,
    y: 50,
    vx: 2,
    vy: 0,
  });

  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const img1 = new Image();
    img1.src = '/p1.png';
    img1.onload = () => { p1Img.current = img1; };
    
    const img2 = new Image();
    img2.src = '/p2.png';
    img2.onload = () => { p2Img.current = img2; };

    bgmRef.current = new Audio('/bgm.mp3');
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.4;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyK'].includes(e.code)) {
        e.preventDefault();
      }
      keys.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let animationFrameId: number;

    const resetBall = (toP1: boolean) => {
      ballRef.current = {
        x: toP1 ? 50 : CANVAS_WIDTH - 50,
        y: 50,
        vx: toP1 ? 2 : -2,
        vy: 0,
      };
    };

    const createSpikeEffect = (x: number, y: number) => {
      const colors = ['#FF4500', '#FF8C00', '#FFD700', '#FFFFFF'];
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const update = () => {
      const p1 = p1Ref.current;
      const p2 = p2Ref.current;
      const ball = ballRef.current;
      const gameMode = gameModeRef.current;

      if (keys.current['KeyA']) p1.vx = -MOVE_SPEED;
      else if (keys.current['KeyD']) p1.vx = MOVE_SPEED;
      else p1.vx = 0;

      if (keys.current['KeyW'] && !p1.isJumping) {
        p1.vy = JUMP_FORCE;
        p1.isJumping = true;
      }

      const isP1Spiking = keys.current['Space'];

      if (gameMode === 'pvp') {
        if (keys.current['ArrowLeft']) p2.vx = -MOVE_SPEED;
        else if (keys.current['ArrowRight']) p2.vx = MOVE_SPEED;
        else p2.vx = 0;

        if (keys.current['ArrowUp'] && !p2.isJumping) {
          p2.vy = JUMP_FORCE;
          p2.isJumping = true;
        }
      } else {
        if (ball.x > NET_X) {
          if (ball.x < p2.x + PIKACHU_WIDTH / 2) p2.vx = -MOVE_SPEED * 0.8;
          else if (ball.x > p2.x + PIKACHU_WIDTH / 2) p2.vx = MOVE_SPEED * 0.8;
          else p2.vx = 0;

          if (ball.y < p2.y && !p2.isJumping && Math.abs(ball.x - p2.x) < 50) {
            p2.vy = JUMP_FORCE;
            p2.isJumping = true;
          }
        } else {
          const targetX = CANVAS_WIDTH * 0.75 - PIKACHU_WIDTH / 2;
          if (p2.x < targetX - 5) p2.vx = MOVE_SPEED * 0.5;
          else if (p2.x > targetX + 5) p2.vx = -MOVE_SPEED * 0.5;
          else p2.vx = 0;
        }
      }

      const isP2Spiking = gameMode === 'pvp' ? keys.current['KeyK'] : (Math.abs(ball.x - (p2.x + PIKACHU_WIDTH/2)) < 25 && p2.isJumping);

      [p1, p2].forEach((p, index) => {
        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;

        if (p.y >= GROUND_Y - PIKACHU_HEIGHT) {
          p.y = GROUND_Y - PIKACHU_HEIGHT;
          p.vy = 0;
          p.isJumping = false;
        }

        const minX = index === 0 ? 0 : NET_X + NET_WIDTH / 2;
        const maxX = index === 0 ? NET_X - NET_WIDTH / 2 - PIKACHU_WIDTH : CANVAS_WIDTH - PIKACHU_WIDTH;
        
        if (p.x < minX) p.x = minX;
        if (p.x > maxX) p.x = maxX;
      });

      ball.vy += GRAVITY * 0.5;
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x < BALL_RADIUS) {
        ball.x = BALL_RADIUS;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x > CANVAS_WIDTH - BALL_RADIUS) {
        ball.x = CANVAS_WIDTH - BALL_RADIUS;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y < BALL_RADIUS) {
        ball.y = BALL_RADIUS;
        ball.vy = Math.abs(ball.vy);
      }

      if (ball.y > GROUND_Y - BALL_RADIUS) {
        if (ball.x < NET_X) {
          setScore(s => {
            const next = { ...s, p2: s.p2 + 1 };
            if (next.p2 >= 15) {
              setGameState('gameOver');
              setWinner(2);
            }
            return next;
          });
          resetBall(true);
        } else {
          setScore(s => {
            const next = { ...s, p1: s.p1 + 1 };
            if (next.p1 >= 15) {
              setGameState('gameOver');
              setWinner(1);
            }
            return next;
          });
          resetBall(false);
        }
      }

      if (
        ball.y + BALL_RADIUS > NET_Y &&
        ball.x + BALL_RADIUS > NET_X - NET_WIDTH / 2 &&
        ball.x - BALL_RADIUS < NET_X + NET_WIDTH / 2
      ) {
        if (ball.y < NET_Y + 10) {
          ball.vy = -Math.abs(ball.vy) * 0.8;
          ball.y = NET_Y - BALL_RADIUS;
        } else {
          ball.vx = -ball.vx;
          ball.x = ball.x < NET_X ? NET_X - NET_WIDTH / 2 - BALL_RADIUS : NET_X + NET_WIDTH / 2 + BALL_RADIUS;
        }
      }

      [p1, p2].forEach((p, index) => {
        const dx = ball.x - (p.x + PIKACHU_WIDTH / 2);
        const dy = ball.y - (p.y + PIKACHU_HEIGHT / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < BALL_RADIUS + PIKACHU_WIDTH / 2) {
          const angle = Math.atan2(dy, dx);
          const isSpiking = (index === 0 && isP1Spiking) || (index === 1 && isP2Spiking);

          if (isSpiking) {
            const spikePower = 8.5;
            ball.vx = Math.cos(angle) * spikePower;
            ball.vy = Math.sin(angle) * spikePower;
            createSpikeEffect(ball.x, ball.y);
          } else {
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            const newSpeed = Math.min(speed + 1.0, BALL_MAX_SPEED);
            ball.vx = Math.cos(angle) * newSpeed;
            ball.vy = Math.sin(angle) * newSpeed;
          }

          const angleOut = Math.atan2(ball.y - (p.y + PIKACHU_HEIGHT/2), ball.x - (p.x + PIKACHU_WIDTH/2));
          ball.x = p.x + PIKACHU_WIDTH / 2 + Math.cos(angleOut) * (BALL_RADIUS + PIKACHU_WIDTH / 2);
          ball.y = p.y + PIKACHU_HEIGHT / 2 + Math.sin(angleOut) * (BALL_RADIUS + PIKACHU_WIDTH / 2);
        }
      });

      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      draw();
      animationFrameId = requestAnimationFrame(update);
    };

    const draw = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      [ {x: 80, y: 50}, {x: 300, y: 30}, {x: 520, y: 60} ].forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 20, 0, Math.PI * 2);
        ctx.arc(c.x + 15, c.y - 10, 20, 0, Math.PI * 2);
        ctx.arc(c.x + 30, c.y, 20, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#228B22';
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.quadraticCurveTo(CANVAS_WIDTH / 4, GROUND_Y - 40, CANVAS_WIDTH / 2, GROUND_Y - 20);
      ctx.quadraticCurveTo(CANVAS_WIDTH * 0.75, GROUND_Y - 60, CANVAS_WIDTH, GROUND_Y);
      ctx.fill();
      ctx.fillStyle = '#F4A460';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
      ctx.fillStyle = '#FFB6C1';
      ctx.fillRect(NET_X - NET_WIDTH / 2, NET_Y, NET_WIDTH, NET_HEIGHT);
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(NET_X, NET_Y, 4, 0, Math.PI * 2);
      ctx.fill();

      if (p1Img.current) {
        ctx.drawImage(p1Img.current, p1Ref.current.x, p1Ref.current.y, PIKACHU_WIDTH, PIKACHU_HEIGHT);
      } else {
        ctx.fillStyle = '#FFFF00';
        ctx.fillRect(p1Ref.current.x, p1Ref.current.y, PIKACHU_WIDTH, PIKACHU_HEIGHT);
      }

      if (p2Img.current) {
        ctx.drawImage(p2Img.current, p2Ref.current.x, p2Ref.current.y, PIKACHU_WIDTH, PIKACHU_HEIGHT);
      } else {
        ctx.fillStyle = '#FFFF00';
        ctx.fillRect(p2Ref.current.x, p2Ref.current.y, PIKACHU_WIDTH, PIKACHU_HEIGHT);
      }

      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(ballRef.current.x, ballRef.current.y, BALL_RADIUS, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ballRef.current.x, ballRef.current.y, BALL_RADIUS, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ballRef.current.x, ballRef.current.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ballRef.current.x - BALL_RADIUS, ballRef.current.y);
      ctx.lineTo(ballRef.current.x + BALL_RADIUS, ballRef.current.y);
      ctx.stroke();
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(ballRef.current.x, ballRef.current.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState]);

  const startGame = (mode: 'pva' | 'pvp') => {
    setScore({ p1: 0, p2: 0 });
    gameModeRef.current = mode;
    setGameState('playing');
    setWinner(null);
    particlesRef.current = [];
    if (bgmRef.current) {
      bgmRef.current.play().catch(e => console.log("BGM play failed:", e));
    }
  };

  return (
    <div className="game-container">
      <div className="scoreboard">
        <span className="p1-score">{score.p1}</span>
        <span className="p2-score">{score.p2}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas"
      />
      {gameState === 'start' && (
        <div className="overlay">
          <h1>Pikachu Volleyball</h1>
          <div className="menu">
            <button onClick={() => startGame('pva')}>Player vs AI</button>
            <button onClick={() => startGame('pvp')}>Player vs Player</button>
          </div>
          <div className="controls-hint">
            <p>P1: W(Jump), A,D(Move), Space(Spike)</p>
            <p>P2: ArrowKeys(Move), K (Spike)</p>
          </div>
        </div>
      )}
      {gameState === 'gameOver' && (
        <div className="overlay">
          <h1>Game Over</h1>
          <h2>Player {winner} Wins!</h2>
          <div className="menu">
            <button onClick={() => startGame('pva')}>Retry (AI)</button>
            <button onClick={() => startGame('pvp')}>Retry (PVP)</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
