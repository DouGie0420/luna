'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function LanguageSelector() {
  const { setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const language = localStorage.getItem('language');
    if (!language) {
      setIsOpen(true);
    }
  }, []);

  const handleSelectLanguage = (lang: 'en' | 'zh' | 'th') => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]" hideCloseButton={true}>
        <DialogHeader>
          <DialogTitle>Select Language / 选择语言 / เลือกภาษา</DialogTitle>
          <DialogDescription>
            Choose your preferred language. You can change this later in settings.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button onClick={() => handleSelectLanguage('en')}>English</Button>
          <Button onClick={() => handleSelectLanguage('zh')}>中文 (Chinese)</Button>
          <Button onClick={() => handleSelectLanguage('th')}>ไทย (Thai)</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
