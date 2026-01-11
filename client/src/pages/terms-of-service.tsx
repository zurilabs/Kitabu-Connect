import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
            <p className="text-gray-600">Kitabu Connect</p>
            <p className="text-sm text-gray-500">Last Updated: January 11, 2026</p>
          </div>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. INTRODUCTION AND ACCEPTANCE OF TERMS</h2>
              <p className="text-gray-700 mb-4">
                Welcome to Kitabu Connect (the "Platform," "we," "us," or "our"). These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Kitabu Connect regarding your access to and use of our peer-to-peer marketplace platform for buying, selling, and exchanging school textbooks in Kenya.
              </p>
              <p className="text-gray-700 mb-4">
                By accessing, browsing, or using the Kitabu Connect platform (including our website, mobile application, and related services), you acknowledge that you have read, understood, and agree to be bound by these Terms, our Privacy Policy, and all applicable laws and regulations of the Republic of Kenya.
              </p>
              <p className="text-gray-700 font-semibold">
                IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST NOT ACCESS OR USE THE PLATFORM.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. DEFINITIONS</h2>
              <p className="text-gray-700 mb-2">For the purposes of these Terms:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>"Platform"</strong> means the Kitabu Connect website, mobile application, and all related services, features, and functionalities.</li>
                <li><strong>"User"</strong> means any person who accesses or uses the Platform, including both Buyers and Sellers.</li>
                <li><strong>"Seller"</strong> means a User who lists textbooks for sale or exchange on the Platform.</li>
                <li><strong>"Buyer"</strong> means a User who purchases or exchanges textbooks through the Platform.</li>
                <li><strong>"Listing"</strong> means any textbook, product, or service posted for sale or exchange on the Platform.</li>
                <li><strong>"Transaction"</strong> means any purchase, sale, or exchange of textbooks facilitated through the Platform.</li>
                <li><strong>"Content"</strong> means text, images, photographs, videos, reviews, messages, and any other materials posted, uploaded, or transmitted through the Platform.</li>
                <li><strong>"Intellectual Property"</strong> means all patents, trademarks, service marks, copyrights, trade secrets, and other proprietary rights.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. ELIGIBILITY AND ACCOUNT REGISTRATION</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Eligibility Requirements</h3>
              <p className="text-gray-700 mb-2">To use the Platform, you must:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li>Be at least eighteen (18) years of age or have obtained verifiable parental or guardian consent if under 18, in compliance with the Data Protection Act, 2019</li>
                <li>Have the legal capacity to enter into binding contracts under Kenyan law</li>
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Not have been previously suspended or banned from the Platform</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Account Creation and Security</h3>
              <p className="text-gray-700 mb-2">You agree to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li>Provide accurate personal information including name, email address, phone number, and location</li>
                <li>Maintain the security and confidentiality of your account credentials</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Accept responsibility for all activities conducted through your account</li>
                <li>Update your account information to maintain accuracy</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 One Account Per User</h3>
              <p className="text-gray-700">
                Each User may maintain only one active account. Creating multiple accounts for fraudulent purposes or to circumvent suspension or termination is strictly prohibited and may result in permanent ban and legal action.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. USER RESPONSIBILITIES AND CONDUCT</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Prohibited Conduct</h3>
              <p className="text-gray-700 mb-2">You agree NOT to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li>Violate any applicable local, national, or international law or regulation</li>
                <li>Infringe upon the intellectual property rights of others</li>
                <li>Post, transmit, or distribute content that is defamatory, obscene, pornographic, abusive, or hateful</li>
                <li>Engage in fraudulent, deceptive, or misleading practices</li>
                <li>List counterfeit, stolen, or unauthorized goods</li>
                <li>Harass, threaten, stalk, or abuse other Users</li>
                <li>Interfere with or disrupt the Platform or servers or networks connected to the Platform</li>
                <li>Use automated systems (bots, scrapers) to access the Platform without authorization</li>
                <li>Attempt to gain unauthorized access to any portion of the Platform</li>
                <li>Transmit viruses, malware, or any other malicious code</li>
                <li>Engage in any form of market manipulation or artificial price inflation</li>
                <li>Circumvent any security features or technological protection measures of the Platform</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Compliance with Kenyan Law</h3>
              <p className="text-gray-700 mb-2">You agree to comply with all applicable Kenyan laws, including but not limited to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>The Constitution of Kenya, 2010 (particularly Article 46 on consumer rights)</li>
                <li>The Data Protection Act, 2019 (No. 24 of 2019)</li>
                <li>The Consumer Protection Act, 2012 (No. 46 of 2012)</li>
                <li>The Kenya Information and Communications Act</li>
                <li>The Computer Misuse and Cybercrimes Act, 2018</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. LISTINGS AND TRANSACTIONS</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 Seller Responsibilities</h3>
              <p className="text-gray-700 mb-2">As a Seller, you represent and warrant that:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li>You have the legal right to sell or transfer the textbooks you list</li>
                <li>All information in your Listings is accurate, current, and complete</li>
                <li>The condition of listed textbooks is honestly and accurately described</li>
                <li>Photographs genuinely represent the actual item being sold</li>
                <li>Prices are clearly stated in Kenya Shillings (KES)</li>
                <li>You will fulfill all confirmed orders in a timely manner</li>
                <li>You will communicate promptly and professionally with Buyers</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 Prohibited Items</h3>
              <p className="text-gray-700 mb-2">The following items are strictly prohibited from being listed on the Platform:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li>Counterfeit, pirated, or unauthorized copies of textbooks</li>
                <li>Stolen or illegally obtained textbooks</li>
                <li>Items that violate intellectual property rights</li>
                <li>Obscene, pornographic, or offensive materials</li>
                <li>Items prohibited by Kenyan law</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.3 Buyer Responsibilities</h3>
              <p className="text-gray-700 mb-2">As a Buyer, you agree to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li>Review Listings carefully before making purchase decisions</li>
                <li>Honor all purchase commitments made through the Platform</li>
                <li>Make timely payments through authorized payment methods</li>
                <li>Communicate respectfully and professionally with Sellers</li>
                <li>Inspect items upon delivery and report any discrepancies promptly</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">5.4 Nature of Platform - Peer-to-Peer Marketplace</h3>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-gray-800 font-semibold mb-2">IMPORTANT:</p>
                <p className="text-gray-700">
                  Kitabu Connect is a peer-to-peer marketplace that facilitates connections between Buyers and Sellers. We are NOT a party to any transaction between Users. All transactions occur directly between Buyers and Sellers.
                </p>
              </div>
              <p className="text-gray-700 mb-2">Kitabu Connect does not:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Own, sell, or purchase any textbooks listed on the Platform</li>
                <li>Guarantee the quality, safety, authenticity, or legality of listed items</li>
                <li>Guarantee the accuracy of Listings or User representations</li>
                <li>Guarantee that transactions will be completed successfully</li>
                <li>Act as an agent, fiduciary, or representative of any User</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. PAYMENT AND FEES</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Platform Fees</h3>
              <p className="text-gray-700 mb-2">Kitabu Connect may charge fees for certain services, including but not limited to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li>Transaction fees or commission on completed sales</li>
                <li>Premium listing or featured placement fees</li>
                <li>Additional service fees as may be introduced and communicated to Users</li>
              </ul>
              <p className="text-gray-700">
                All applicable fees will be clearly displayed before you complete any transaction. By proceeding with a transaction, you agree to pay all applicable fees.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. CONSUMER RIGHTS AND PRODUCT LIABILITY</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 Consumer Rights Under Kenyan Law</h3>
              <p className="text-gray-700 mb-2">In accordance with Article 46 of the Constitution of Kenya, 2010 and the Consumer Protection Act, 2012, consumers have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li>Goods and services of reasonable quality</li>
                <li>Information necessary to gain full benefit from goods and services</li>
                <li>Protection of their health, safety, and economic interests</li>
                <li>Compensation for loss or injury arising from defects in goods or services</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2 Returns and Refunds</h3>
              <p className="text-gray-700 mb-2">Returns and refunds are governed by the following principles:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Buyers may return items that are materially different from the Listing description</li>
                <li>Return requests must be initiated within seven (7) days of receiving the item</li>
                <li>Items must be returned in the same condition as received</li>
                <li>Refunds are processed through the original payment method within fourteen (14) days of return approval</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. INTELLECTUAL PROPERTY RIGHTS</h2>
              <p className="text-gray-700 mb-4">
                All content, features, and functionality of the Platform are the exclusive property of Kitabu Connect or its licensors and are protected by Kenyan and international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              <p className="text-gray-700">
                By posting Content to the Platform, you grant Kitabu Connect a worldwide, non-exclusive, royalty-free, transferable license to use, reproduce, distribute, prepare derivative works of, display, and perform such Content in connection with operating the Platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. PRIVACY AND DATA PROTECTION</h2>
              <p className="text-gray-700">
                Your privacy is important to us. Our collection, use, storage, and disclosure of personal data is governed by our <Link href="/privacy-policy"><a className="text-purple-600 hover:underline">Privacy Policy</a></Link>, which complies with the Data Protection Act, 2019. We are registered as a data controller with the Office of the Data Protection Commissioner.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. DISCLAIMERS AND LIMITATIONS OF LIABILITY</h2>

              <div className="bg-gray-50 border-l-4 border-gray-400 p-4 mb-4">
                <p className="text-gray-800 font-semibold mb-2">THE PLATFORM IS PROVIDED "AS IS"</p>
                <p className="text-gray-700 mb-2">
                  The Platform is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind. We do not guarantee that the Platform will be uninterrupted, secure, or error-free.
                </p>
              </div>

              <p className="text-gray-700 mb-2">Kitabu Connect is not responsible for:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li>The conduct of any User</li>
                <li>The accuracy, quality, legality, or authenticity of items listed</li>
                <li>The ability of Sellers to complete sales or Buyers to complete purchases</li>
                <li>Disputes between Users regarding transactions</li>
              </ul>

              <p className="text-gray-700">
                In no event shall our total liability exceed the amount you have paid to Kitabu Connect in the twelve (12) months prior to the claim, or One Hundred Thousand Kenya Shillings (KES 100,000), whichever is less.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. DISPUTE RESOLUTION</h2>
              <p className="text-gray-700 mb-4">
                In the event of any dispute, you agree to first contact us at disputes@kitabuconnect.com to attempt informal resolution. If unsuccessful, disputes will be submitted to mediation and, if necessary, arbitration under the Arbitration Act, 1995 of Kenya.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. TERMINATION</h2>
              <p className="text-gray-700 mb-4">
                You may terminate your account at any time. We reserve the right to suspend or terminate your account for violation of these Terms, fraudulent activity, or at our discretion.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. GENERAL PROVISIONS</h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Governing Law</h3>
              <p className="text-gray-700 mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the Republic of Kenya.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Modifications</h3>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these Terms at any time. Material changes will be communicated via email or prominent notice on the Platform. Your continued use constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. CONTACT INFORMATION</h2>
              <p className="text-gray-700 mb-2">For questions regarding these Terms, please contact:</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700"><strong>Kitabu Connect</strong></p>
                <p className="text-gray-700">Email: legal@kitabuconnect.com</p>
                <p className="text-gray-700">Support: support@kitabuconnect.com</p>
              </div>
            </section>

            <section className="mb-8">
              <div className="bg-purple-50 border-l-4 border-purple-600 p-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">ACKNOWLEDGMENT</h2>
                <p className="text-gray-700">
                  BY ACCESSING OR USING THE KITABU CONNECT PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
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
