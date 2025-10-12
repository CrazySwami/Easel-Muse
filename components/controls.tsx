'use client';

import { useReactFlow } from '@xyflow/react';
import { useTheme } from 'next-themes';
import { Fragment, useMemo } from 'react';
import { Button } from './ui/button';
import {
  MinusIcon,
  PlusIcon,
  SunIcon,
  MoonIcon,
  MaximizeIcon,
  LockIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { useCanvasStore } from '@/hooks/use-canvas-store';
import { cn } from '@/lib/utils';

export const Controls = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { theme, setTheme } = useTheme();
  const { isLocked, toggleLock } = useCanvasStore();

  const handleZoomIn = () => zoomIn({ duration: 300 });
  const handleZoomOut = () => zoomOut({ duration: 300 });
  const handleFitView = () => fitView({ duration: 300 });

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };


  const buttons = useMemo(
    () => [
      {
        tooltip: 'Zoom in',
        onClick: handleZoomIn,
        children: <PlusIcon size={12} />,
      },
      {
        tooltip: 'Zoom out',
        onClick: handleZoomOut,
        children: <MinusIcon size={12} />,
      },
      {
        tooltip: 'Fit view',
        onClick: handleFitView,
        children: <MaximizeIcon size={12} />,
      },
      {
        tooltip: 'Toggle theme',
        onClick: toggleTheme,
        children:
          theme === 'dark' ? <SunIcon size={12} /> : <MoonIcon size={12} />,
      },
      {
        tooltip: isLocked ? 'Unlock canvas' : 'Lock canvas',
        onClick: toggleLock,
        children: <LockIcon size={12} />,
        className: isLocked ? 'bg-green-500/20 text-green-500' : '',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, isLocked]
  );


  return (
    <TooltipProvider>
      <div className="flex flex-col items-center gap-1 rounded-xl border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
        {buttons.map((button, index) => (
          <Fragment key={index}>
            {button.tooltip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn('rounded-full', button.className)}
                    onClick={button.onClick}
                  >
                    {button.children}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{button.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Fragment key={index}>{button.children}</Fragment>
            )}
          </Fragment>
        ))}
      </div>
    </TooltipProvider>
  );
};

// Top-bar dropdown menu version of Controls
export const ControlsMenu = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { theme, setTheme } = useTheme();
  const { isLocked, toggleLock } = useCanvasStore();

  const handleZoomIn = () => zoomIn({ duration: 300 });
  const handleZoomOut = () => zoomOut({ duration: 300 });
  const handleFitView = () => fitView({ duration: 300 });
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="rounded-full" onClick={handleZoomOut}>
          <MinusIcon size={12} />
        </Button>
        <Button size="icon" variant="ghost" className="rounded-full" onClick={handleZoomIn}>
          <PlusIcon size={12} />
        </Button>
        <Button size="icon" variant="ghost" className="rounded-full" onClick={handleFitView}>
          <MaximizeIcon size={12} />
        </Button>
        <Button size="icon" variant="ghost" className="rounded-full" onClick={toggleTheme}>
          {theme === 'dark' ? <SunIcon size={12} /> : <MoonIcon size={12} />}
        </Button>
        <Button size="icon" variant="ghost" className={cn('rounded-full', isLocked ? 'bg-green-500/20 text-green-500' : '')} onClick={toggleLock}>
          <LockIcon size={12} />
        </Button>
      </div>
    </TooltipProvider>
  );
};
