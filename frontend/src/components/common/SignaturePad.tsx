import { useRef, useState, useEffect } from 'react';
import { Box, Button } from '@mui/material';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  readOnly?: boolean;
  initialValue?: string | null;
}

export default function SignaturePad({ onSave, onClear, readOnly = false, initialValue }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (initialValue && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = initialValue;
      }
    }
  }, [initialValue]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    
    // Prevent scrolling when drawing on touch devices
    if ('touches' in e) {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
  };

  const stopDrawing = () => {
    if (readOnly) return;
    setIsDrawing(false);
  };

  const handleClear = () => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (onClear) onClear();
  };

  const handleSave = () => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if canvas is empty (simplified check)
    // Actually we will just export it
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <Box>
      <Box 
        sx={{ 
          border: '2px dashed #cbd5e1', 
          borderRadius: 2, 
          bgcolor: readOnly ? '#f8fafc' : '#ffffff',
          overflow: 'hidden',
          display: 'inline-block',
          touchAction: 'none' // Prevent default touch actions (scrolling)
        }}
      >
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ cursor: readOnly ? 'default' : 'crosshair' }}
        />
      </Box>
      
      {!readOnly && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={handleClear} color="inherit">
            지우기
          </Button>
          <Button variant="contained" onClick={handleSave} color="primary">
            서명 완료 및 저장
          </Button>
        </Box>
      )}
    </Box>
  );
}
