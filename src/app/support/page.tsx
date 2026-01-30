'use client';

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

export default function SupportPage() {
  const { t } = useTranslation();

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
              <form className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">{t('supportPage.emailLabel')}</Label>
                  <Input id="email" type="email" placeholder={t('supportPage.emailPlaceholder')} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="category">{t('supportPage.inquiryTypeLabel')}</Label>
                    <Select>
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
                  <Input id="subject" placeholder={t('supportPage.subjectPlaceholder')} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">{t('supportPage.descriptionLabel')}</Label>
                  <Textarea id="description" placeholder={t('supportPage.descriptionPlaceholder')} rows={6} />
                </div>
                
                <div className="flex justify-end">
                    <Button type="submit" size="lg">{t('supportPage.submitTicket')}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
