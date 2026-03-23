'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button"
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
import { Loader2, HeadphonesIcon, CreditCard, ArrowLeftRight, User, Bug, MoreHorizontal, FileText, AlignLeft, Sparkles, Send } from "lucide-react";
import { motion } from "framer-motion";

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
      const now = serverTimestamp();
      await addDoc(collection(firestore, 'support_tickets'), {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        category,
        subject,
        description,
        status: 'Open',
        createdAt: now,
        updatedAt: now,
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

  const categoryIcons: Record<string, React.ReactNode> = {
    payment: <CreditCard className="w-4 h-4" />,
    transaction: <ArrowLeftRight className="w-4 h-4" />,
    account: <User className="w-4 h-4" />,
    bug: <Bug className="w-4 h-4" />,
    other: <MoreHorizontal className="w-4 h-4" />,
  };

  return (
    <>
      <PageHeaderWithBackAndClose />

      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-pink-600/8 rounded-full blur-[100px]" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-600/8 rounded-full blur-[80px]" />
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">

          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-4 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
              <HeadphonesIcon className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent font-headline">
              {t('supportPage.title')}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {t('supportPage.description')}
            </p>
          </motion.div>

          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative"
          >
            {/* Glow border */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-purple-500/30 via-transparent to-pink-500/20 pointer-events-none" />

            <div className="relative bg-card/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden">

              {/* Top accent bar */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />

              <div className="p-8">
                {/* Card Header */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs text-purple-300 font-medium">Support Ticket</span>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-purple-500/20 to-transparent" />
                </div>

                <form className="grid gap-7" onSubmit={handleSubmit}>

                  {/* Category */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid gap-2"
                  >
                    <Label htmlFor="category" className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-purple-500/20 text-purple-400">
                        <MoreHorizontal className="w-3 h-3" />
                      </span>
                      {t('supportPage.inquiryTypeLabel')}
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-background/50 border-white/10 hover:border-purple-500/40 focus:border-purple-500/60 focus:ring-purple-500/20 transition-colors h-11">
                        <SelectValue placeholder={t('supportPage.inquiryTypePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-xl border-white/10">
                        <SelectItem value="payment">
                          <span className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-purple-400" />
                            {t('supportPage.payment')}
                          </span>
                        </SelectItem>
                        <SelectItem value="transaction">
                          <span className="flex items-center gap-2">
                            <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                            {t('supportPage.transaction')}
                          </span>
                        </SelectItem>
                        <SelectItem value="account">
                          <span className="flex items-center gap-2">
                            <User className="w-4 h-4 text-green-400" />
                            {t('supportPage.account')}
                          </span>
                        </SelectItem>
                        <SelectItem value="bug">
                          <span className="flex items-center gap-2">
                            <Bug className="w-4 h-4 text-red-400" />
                            {t('supportPage.bug')}
                          </span>
                        </SelectItem>
                        <SelectItem value="other">
                          <span className="flex items-center gap-2">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            {t('supportPage.other')}
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>

                  {/* Subject */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                    className="grid gap-2"
                  >
                    <Label htmlFor="subject" className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-pink-500/20 text-pink-400">
                        <FileText className="w-3 h-3" />
                      </span>
                      {t('supportPage.subjectLabel')}
                    </Label>
                    <Input
                      id="subject"
                      placeholder={t('supportPage.subjectPlaceholder')}
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      className="bg-background/50 border-white/10 hover:border-purple-500/40 focus:border-purple-500/60 focus-visible:ring-purple-500/20 h-11 transition-colors"
                    />
                  </motion.div>

                  {/* Description */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid gap-2"
                  >
                    <Label htmlFor="description" className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-indigo-500/20 text-indigo-400">
                        <AlignLeft className="w-3 h-3" />
                      </span>
                      {t('supportPage.descriptionLabel')}
                    </Label>
                    <Textarea
                      id="description"
                      placeholder={t('supportPage.descriptionPlaceholder')}
                      rows={6}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="bg-background/50 border-white/10 hover:border-purple-500/40 focus:border-purple-500/60 focus-visible:ring-purple-500/20 resize-none transition-colors"
                    />
                  </motion.div>

                  {/* Submit */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="flex justify-end pt-2"
                  >
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting}
                      className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all duration-300 px-8"
                    >
                      <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      {t('supportPage.submitTicket')}
                    </Button>
                  </motion.div>

                </form>
              </div>

              {/* Bottom accent */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />
            </div>
          </motion.div>

          {/* Info Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-muted-foreground/60 mt-6"
          >
            Typical response time: 24–48 hours · Available 7 days a week
          </motion.p>

        </div>
      </div>
    </>
  );
}
