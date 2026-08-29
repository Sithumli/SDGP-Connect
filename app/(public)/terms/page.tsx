// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.
"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { AlertTriangle, Ban, Copyright, FileText, Gavel, Globe, Mail, Scale, ShieldCheck, UserCheck, Upload } from 'lucide-react';
import Link from 'next/link';

const TermsOfServicePage = () => {
  const lastUpdated = "August 29, 2026";

  const sections = [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      icon: Gavel,
      content: `These Terms of Service ("Terms") govern your access to and use of SDGP.LK (the "Platform"), operated in connection with the Software Development Group Project module at the Informatics Institute of Technology (IIT). By creating an account, signing in, or otherwise using the Platform, you agree to be bound by these Terms. If you do not agree, you must not use the Platform.`
    },
    {
      id: "eligibility",
      title: "Eligibility and Accounts",
      icon: UserCheck,
      content: `Access to authenticated areas of the Platform is restricted:`,
      details: [
        "Accounts are limited to holders of an @iit.ac.lk email address, except for administrator accounts explicitly authorised by the Platform operators",
        "You may sign in with your email and password, or with Google using an eligible address",
        "You are responsible for keeping your password and account credentials confidential",
        "You must not share your account, or use another person's account, without authorisation",
        "You must notify us promptly if you believe your account has been accessed without your permission",
        "We may suspend or remove accounts that do not meet the eligibility rules or that breach these Terms"
      ]
    },
    {
      id: "acceptable-use",
      title: "Acceptable Use",
      icon: Ban,
      content: `When using the Platform you agree not to:`,
      details: [
        "Submit content that is unlawful, defamatory, harassing, discriminatory, or infringes another person's rights",
        "Misrepresent authorship, or submit work that is not your own or your team's",
        "Upload malware, or attempt to disrupt, overload, or gain unauthorised access to the Platform or its infrastructure",
        "Attempt to bypass authentication, authorisation, or rate limiting controls",
        "Scrape, harvest, or bulk-extract data from the Platform without written permission",
        "Use the Platform for commercial purposes, consistent with the non-commercial licence under which it is published"
      ]
    },
    {
      id: "user-content",
      title: "Your Content",
      icon: Upload,
      content: `You retain ownership of the projects, blog posts, images, and other material you submit ("Your Content"). By submitting Your Content you grant us a non-exclusive, royalty-free licence to host, store, reproduce, and display it for the purpose of operating the Platform and showcasing student work. You represent that:`,
      details: [
        "You own Your Content, or have the necessary rights and permissions to submit it",
        "Your Content does not infringe any third party's intellectual property, privacy, or other rights",
        "Any individuals identifiable in images or media you upload have consented to that use",
        "Submissions marked for public display may be visible to anyone on the internet, including search engines"
      ]
    },
    {
      id: "moderation",
      title: "Review and Moderation",
      icon: ShieldCheck,
      content: `Submissions to the Platform are subject to review:`,
      details: [
        "Projects, awards, competitions, and blog posts may require approval before they appear publicly",
        "We may edit, unpublish, or remove content that breaches these Terms or the module's academic requirements",
        "We may decline or reverse a submission without providing detailed reasons, at our discretion",
        "Moderation decisions relating to academic assessment remain the responsibility of the module teaching team"
      ]
    },
    {
      id: "intellectual-property",
      title: "Platform Intellectual Property",
      icon: Copyright,
      content: `The Platform's source code is published under the GNU Affero General Public License v3.0 or later, with an additional restriction limiting use to non-commercial purposes. The SDGP.LK name, logo, and branding remain the property of their respective owners and are not licensed for reuse. Nothing in these Terms transfers ownership of the Platform to you.`
    },
    {
      id: "availability",
      title: "Availability and Changes",
      icon: AlertTriangle,
      content: `The Platform is provided on an "as is" and "as available" basis:`,
      details: [
        "We do not guarantee uninterrupted or error-free operation",
        "Features may be added, changed, or withdrawn without prior notice",
        "Planned maintenance may make the Platform temporarily unavailable",
        "We are not responsible for loss of data caused by factors outside our reasonable control, and you should keep your own copies of important work"
      ]
    },
    {
      id: "liability",
      title: "Limitation of Liability",
      icon: Scale,
      content: `To the fullest extent permitted by applicable law, the Platform operators shall not be liable for any indirect, incidental, special, or consequential loss, including loss of data, loss of academic marks, or loss of opportunity, arising from your use of or inability to use the Platform. Nothing in these Terms excludes liability that cannot lawfully be excluded.`
    },
    {
      id: "termination",
      title: "Suspension and Termination",
      icon: Ban,
      content: `We may suspend or terminate your access to the Platform if you breach these Terms, if your email address ceases to be eligible, or if required for security or legal reasons. You may stop using the Platform at any time and request deletion of your personal data as described in our Privacy Policy. Content that has already been published as part of the public project archive may be retained.`
    },
    {
      id: "changes",
      title: "Changes to These Terms",
      icon: FileText,
      content: `We may revise these Terms from time to time. When we make material changes we will update the "Last Updated" date and, where appropriate, notify users through the Platform or by email. Continuing to use the Platform after changes take effect constitutes acceptance of the revised Terms. If you do not agree to the revised Terms, you should stop using the Platform.`
    },
    {
      id: "governing-law",
      title: "Governing Law",
      icon: Gavel,
      content: `These Terms are governed by the laws of Sri Lanka. Any dispute arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Sri Lanka.`
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="text-center mb-12"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 mb-6">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Scale className="w-8 h-8" />
            </div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
          >
            Terms of Service
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6"
          >
            The rules that apply when you use SDGP.LK. Please read them before creating an account or submitting work.
          </motion.p>

          <motion.div variants={itemVariants}>
            <Badge variant="secondary" className="text-sm">
              Last Updated: {lastUpdated}
            </Badge>
          </motion.div>
        </motion.div>

        {/* Terms Sections */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-8"
        >
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              id={section.id}
              variants={itemVariants}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <section.icon className="w-5 h-5" />
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {section.content}
                    </p>
                    {section.details && (
                      <ul className="space-y-2">
                        {section.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                            <div className="w-2 h-2 rounded-full bg-primary/60 mt-2 flex-shrink-0"></div>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Contact Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mt-16"
        >
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Mail className="w-8 h-8" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3">Questions About These Terms?</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  If anything here is unclear, or you need to report a breach of these Terms, get in touch and we will help.
                </p>
                <div className="space-y-4">
                  <div className="text-muted-foreground">
                    <strong>Contact Information:</strong>
                    <br />
                    Email: <a href="mailto:support@sdgp.lk" className="text-primary hover:underline">support@sdgp.lk</a>
                    <br />
                    Platform: SDGP.LK
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" className="rounded-full">
                      <Link href="/contact">
                        <Mail className="w-4 h-4 mr-2" />
                        Contact Support
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="rounded-full">
                      <Link href="/privacy">
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Privacy Policy
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Quick Navigation */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mt-12"
        >
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5" />
                  Quick Navigation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {sections.map((section) => (
                    <Button
                      key={section.id}
                      variant="ghost"
                      size="sm"
                      asChild
                      className="justify-start text-left h-auto py-3 px-4 whitespace-normal"
                    >
                      <a href={`#${section.id}`} className="flex items-start gap-2">
                        <section.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="text-sm leading-tight">{section.title}</span>
                      </a>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
