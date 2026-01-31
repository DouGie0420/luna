'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close"
import { useTranslation } from "@/hooks/use-translation";
import { useUser, useFirestore } from "@/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SupportPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: "Please login to submit a ticket." });
      return;
    }
    if (!category || !subject || !description) {
      toast({ variant: 'destructive', title: "All fields are required." });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'supportTickets'), {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        category,
        subject,
        description,
        status: 'Open',
        createdAt: serverTimestamp(),
      });
      toast({ title: "Ticket Submitted", description: "Our support team will get back to you shortly." });
      setCategory('');
      setSubject('');
      setDescription('');
    } catch (error) {
      console.error("Error submitting ticket: ", error);
      toast({ variant: 'destructive', title: "Submission Failed", description: "Could not submit your support ticket. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-headline">{t('supportPage.title')}</CardTitle>
              <CardDescription>
                {t('supportPage.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-6" onSubmit={handleSubmit}>
                <div className="grid gap-2">
                    <Label htmlFor="category">{t('supportPage.inquiryTypeLabel')}</Label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('supportPage.inquiryTypePlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="payment">{t('supportPage.payment')}</SelectItem>
                            <SelectItem value="transaction">{t('supportPage.transaction')}</SelectItem>
                            <SelectItem value="account">{t('supportPage.account')}</SelectItem>
                            <SelectItem value="bug">{t('supportPage.bug')}</SelectItem>
                            <SelectItem value="other">{t('supportPage.other')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subject">{t('supportPage.subjectLabel')}</Label>
                  <Input id="subject" placeholder={t('supportPage.subjectPlaceholder')} value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">{t('supportPage.descriptionLabel')}</Label>
                  <Textarea id="description" placeholder={t('supportPage.descriptionPlaceholder')} rows={6} value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                
                <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('supportPage.submitTicket')}
                    </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
