import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-purple-100 p-4 rounded-full">
                <Shield className="h-12 w-12 text-purple-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-gray-600">Kitabu Connect</p>
            <p className="text-sm text-gray-500">Last Updated: January 11, 2026</p>
          </div>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. INTRODUCTION</h2>
              <p className="text-gray-700 mb-4">
                Kitabu Connect operates a peer-to-peer marketplace platform that enables users in Kenya to buy, sell, and exchange school textbooks. We are committed to protecting your privacy and personal data in compliance with the Data Protection Act, 2019 (No. 24 of 2019) and related Kenyan data protection regulations.
              </p>
              <p className="text-gray-700">
                This Privacy Policy explains how we collect, use, disclose, store, and protect your personal data when you use our website, mobile application, and services. By accessing or using Kitabu Connect, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. DEFINITIONS</h2>
              <p className="text-gray-700 mb-2">For the purposes of this Privacy Policy:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>"Personal Data"</strong> means any information relating to an identified or identifiable natural person (data subject).</li>
                <li><strong>"Data Subject"</strong> means you, the individual whose personal data we process.</li>
                <li><strong>"Data Controller"</strong> means Kitabu Connect, which determines the purposes and means of processing your personal data.</li>
                <li><strong>"Data Processor"</strong> means any third party that processes personal data on our behalf.</li>
                <li><strong>"Processing"</strong> means any operation performed on personal data, including collection, recording, organization, storage, adaptation, retrieval, use, disclosure, or erasure.</li>
                <li><strong>"ODPC"</strong> means the Office of the Data Protection Commissioner.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. DATA CONTROLLER INFORMATION</h2>
              <p className="text-gray-700 mb-4">
                Kitabu Connect is registered as a data controller with the Office of the Data Protection Commissioner. You may contact us regarding data protection matters:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700"><strong>Kitabu Connect</strong></p>
                <p className="text-gray-700">Email: privacy@kitabuconnect.co.ke</p>
                <p className="text-gray-700">Support: support@kitabuconnect.co.ke</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="mr-2 h-6 w-6 text-purple-600" />
                4. PERSONAL DATA WE COLLECT
              </h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Information You Provide Directly</h3>
              <p className="text-gray-700 mb-2">When you register and use our Platform, we collect:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li><strong>Account Information:</strong> Full name, email address, mobile phone number, password (encrypted), and date of birth</li>
                <li><strong>Profile Information:</strong> Profile picture (optional), school or institution name, class or year of study, location, user bio</li>
                <li><strong>Listing Information:</strong> Details of textbooks you list including title, author, ISBN, condition, price, photographs</li>
                <li><strong>Transaction Information:</strong> Purchase history, payment information, delivery preferences, transaction communications</li>
                <li><strong>Communications:</strong> Messages sent through our platform, customer support inquiries, feedback, and reviews</li>
                <li><strong>Identity Verification:</strong> Copies of identification documents for age verification or dispute resolution</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Information Collected Automatically</h3>
              <p className="text-gray-700 mb-2">When you access our Platform, we automatically collect:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li><strong>Device Information:</strong> IP address, browser type and version, operating system, device identifiers</li>
                <li><strong>Usage Data:</strong> Pages visited, time spent on pages, links clicked, search queries, access times and dates</li>
                <li><strong>Location Data:</strong> Approximate location derived from IP address; precise location if you grant permission</li>
                <li><strong>Cookies:</strong> We use cookies, web beacons, and similar technologies to enhance your experience</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Information from Third Parties</h3>
              <p className="text-gray-700 mb-2">We may receive information from:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Social media platforms (if you connect your accounts)</li>
                <li>Payment processors (transaction confirmation and payment status)</li>
                <li>Other users (reports or reviews)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. LEGAL BASIS FOR PROCESSING</h2>
              <p className="text-gray-700 mb-2">Under the Data Protection Act, 2019, we process your personal data based on:</p>
              <div className="grid gap-4 mt-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Consent</h4>
                  <p className="text-gray-700">We obtain your explicit consent when you register, subscribe to communications, or grant permissions. You may withdraw consent at any time.</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Performance of Contract</h4>
                  <p className="text-gray-700">Processing is necessary to perform our contractual obligations, including creating your account, facilitating transactions, and providing customer support.</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Legitimate Interests</h4>
                  <p className="text-gray-700">We process data for legitimate business interests including fraud prevention, security, improving services, and conducting analytics.</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Legal Obligations</h4>
                  <p className="text-gray-700">We may process data to comply with legal obligations under Kenyan law, including tax regulations and law enforcement requests.</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. HOW WE USE YOUR PERSONAL DATA</h2>

              <div className="space-y-4">
                <div className="border-l-4 border-purple-400 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Service Provision</h4>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>Creating, maintaining, and securing your account</li>
                    <li>Facilitating textbook listings and transactions</li>
                    <li>Processing payments</li>
                    <li>Enabling communication between users</li>
                    <li>Providing customer support</li>
                  </ul>
                </div>

                <div className="border-l-4 border-blue-400 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Platform Improvement</h4>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>Analyzing usage patterns</li>
                    <li>Personalizing your experience</li>
                    <li>Conducting research and development</li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-400 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Safety and Security</h4>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>Detecting and preventing fraud</li>
                    <li>Verifying user identities</li>
                    <li>Protecting platform security</li>
                    <li>Resolving disputes</li>
                  </ul>
                </div>

                <div className="border-l-4 border-pink-400 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Marketing and Communications</h4>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>Sending service-related notifications (with consent)</li>
                    <li>Providing promotional offers (with consent)</li>
                    <li>Conducting surveys</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="mr-2 h-6 w-6 text-purple-600" />
                7. DATA SHARING AND DISCLOSURE
              </h2>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-gray-800 font-semibold">We do not sell your personal data.</p>
              </div>

              <p className="text-gray-700 mb-2">We may share your information in the following circumstances:</p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">7.1 With Other Users</h3>
              <p className="text-gray-700 mb-4">
                Your public profile information, listings, and reviews are visible to other users. When you engage in transactions, your contact information may be shared with the other party.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2 Service Providers</h3>
              <p className="text-gray-700 mb-2">We share data with third-party service providers including:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li>Payment processors (M-Pesa, card payment gateways)</li>
                <li>Cloud hosting and storage providers</li>
                <li>Email and SMS communication services</li>
                <li>Customer support and analytics tools</li>
                <li>Fraud detection and prevention services</li>
              </ul>
              <p className="text-gray-700">
                All service providers are contractually required to maintain confidentiality and security of your data.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">7.3 Legal Requirements</h3>
              <p className="text-gray-700">
                We may disclose your information if required by law, court order, or governmental authority, or to protect rights, safety, or investigate fraud.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. CROSS-BORDER DATA TRANSFERS</h2>
              <p className="text-gray-700 mb-4">
                In compliance with Section 48 of the Data Protection Act, 2019, we maintain at least one serving copy of your personal data on servers located within Kenya.
              </p>
              <p className="text-gray-700">
                We may transfer personal data outside Kenya only with your explicit consent, when necessary for contract performance, for public interest reasons, or when we have provided proof of appropriate safeguards to the ODPC.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. DATA RETENTION</h2>
              <p className="text-gray-700 mb-2">We retain your personal data only as long as necessary:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Active Account Data:</strong> Retained while your account is active and for a reasonable period thereafter</li>
                <li><strong>Transaction Records:</strong> Retained for seven (7) years for accounting and legal compliance</li>
                <li><strong>Communications:</strong> Customer support records retained for three (3) years</li>
                <li><strong>Analytics Data:</strong> Aggregated and anonymized data may be retained indefinitely</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Upon account deletion, we will delete or anonymize your personal data within ninety (90) days, except where longer retention is required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
                <Lock className="mr-2 h-6 w-6 text-purple-600" />
                10. DATA SECURITY
              </h2>
              <p className="text-gray-700 mb-2">We implement appropriate security measures including:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li>Encryption of data in transit using SSL/TLS protocols</li>
                <li>Encryption of sensitive data at rest</li>
                <li>Regular security assessments and vulnerability testing</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Employee training on data protection</li>
                <li>Regular backup and disaster recovery procedures</li>
              </ul>
              <p className="text-gray-700">
                Despite our security measures, no system is completely secure. You are responsible for maintaining the confidentiality of your account credentials.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. DATA BREACH NOTIFICATION</h2>
              <p className="text-gray-700">
                In the event of a data breach, we will notify the Office of the Data Protection Commissioner within seventy-two (72) hours and notify you in writing within a reasonably practical period, describing the nature of the breach, potential consequences, and measures taken.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. YOUR RIGHTS AS A DATA SUBJECT</h2>
              <p className="text-gray-700 mb-4">Under the Data Protection Act, 2019, you have the following rights:</p>

              <div className="grid gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Right of Access</h4>
                  <p className="text-gray-700">Request confirmation and access to your personal data in electronic format.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Right to Rectification</h4>
                  <p className="text-gray-700">Request correction of inaccurate or incomplete data through your account settings.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Right to Erasure (Right to be Forgotten)</h4>
                  <p className="text-gray-700">Request deletion of your data where there is no compelling reason for continued processing.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Right to Restriction</h4>
                  <p className="text-gray-700">Request restriction of processing in certain circumstances.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Right to Data Portability</h4>
                  <p className="text-gray-700">Receive your data in a structured, machine-readable format.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Right to Object</h4>
                  <p className="text-gray-700">Object to processing for direct marketing or based on legitimate interests.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Right to Withdraw Consent</h4>
                  <p className="text-gray-700">Withdraw consent at any time where processing is based on consent.</p>
                </div>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mt-4">
                <p className="text-gray-800 font-semibold mb-2">Exercising Your Rights</p>
                <p className="text-gray-700">
                  To exercise any of these rights, contact us at privacy@kitabuconnect.co.ke. We will respond within thirty (30) days.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. CHILDREN'S PRIVACY</h2>
              <p className="text-gray-700 mb-4">
                In compliance with Section 31 of the Data Protection Act, 2019, we do not knowingly collect or process personal data from children under eighteen (18) years without verifiable parental or guardian consent.
              </p>
              <p className="text-gray-700">
                Parents or guardians may request access to, correction of, or deletion of their child's personal data. If we become aware that we have collected data from a child without proper consent, we will delete it immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. COOKIES AND TRACKING TECHNOLOGIES</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Types of Cookies We Use</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li><strong>Essential Cookies:</strong> Necessary for platform operation, authentication, and security</li>
                <li><strong>Functionality Cookies:</strong> Remember your preferences and settings</li>
                <li><strong>Analytics Cookies:</strong> Help us understand user interactions</li>
                <li><strong>Marketing Cookies:</strong> Deliver relevant advertisements and track campaigns</li>
              </ul>

              <p className="text-gray-700">
                You can control cookies through your browser settings. However, disabling certain cookies may affect platform functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. COMPLAINTS AND DISPUTE RESOLUTION</h2>
              <p className="text-gray-700 mb-4">
                If you have concerns about how we handle your data, contact us at privacy@kitabuconnect.co.ke. We will investigate and respond within thirty (30) days.
              </p>

              <p className="text-gray-700 mb-2">If not satisfied, you may lodge a complaint with the Office of the Data Protection Commissioner:</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700"><strong>Office of the Data Protection Commissioner</strong></p>
                <p className="text-gray-700">P.O. Box 43889 – 00100, Nairobi, Kenya</p>
                <p className="text-gray-700">Email: complaints@odpc.go.ke</p>
                <p className="text-gray-700">Website: www.odpc.go.ke</p>
                <p className="text-gray-700">Telephone: +254 (020) 2342960</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. CONTACT INFORMATION</h2>
              <p className="text-gray-700 mb-2">For questions or requests regarding this Privacy Policy, contact:</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700"><strong>Kitabu Connect</strong></p>
                <p className="text-gray-700">Email: privacy@kitabuconnect.co.ke</p>
                <p className="text-gray-700">Support: support@kitabuconnect.co.ke</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. GOVERNING LAW</h2>
              <p className="text-gray-700">
                This Privacy Policy is governed by the laws of the Republic of Kenya, specifically the Data Protection Act, 2019 (No. 24 of 2019), the Constitution of Kenya, 2010, and other applicable Kenyan laws.
              </p>
            </section>

            <section className="mb-8">
              <div className="bg-purple-50 border-l-4 border-purple-600 p-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">ACKNOWLEDGMENT</h2>
                <p className="text-gray-700">
                  By using Kitabu Connect, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree, please do not use our Platform.
                </p>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/">
            <Button variant="outline">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
