---
source_url: https://www.artificialintelligencemadesimple.com/p/the-ai-bubble-isnt-where-you-think
author: Devansh
date: 2026-09-27
---
# The AI Bubble Isn’t Where You Think It Is

### Inside the contracts, guarantees and financing structures connecting OpenAI, Nvidia, Oracle, CoreWeave and the rest of the AI stack.

[](https://substack.com/@chocolatemilkcultleader)

[Devansh](https://substack.com/@chocolatemilkcultleader)

18 hours ago

∙ Paid

_**Every month, the Chocolate Milk Cult reaches over a million Builders, Startup Founders, Investors, Policy Makers, Leaders, and more. [](https://docs.google.com/forms/d/e/1FAIpQLScCSWYlzouT8pzhfl0A2xdA0BxAPYg75h9F-WNkN8XuowpstA/viewform?usp=dialog)** [If you’d like to meet other members of our community, please fill out this contact form here (](https://docs.google.com/forms/d/e/1FAIpQLScCSWYlzouT8pzhfl0A2xdA0BxAPYg75h9F-WNkN8XuowpstA/viewform?usp=dialog)**[I will never sell your data nor will I make intros w/o your explicit permission](https://docs.google.com/forms/d/e/1FAIpQLScCSWYlzouT8pzhfl0A2xdA0BxAPYg75h9F-WNkN8XuowpstA/viewform?usp=dialog)**[)](https://docs.google.com/forms/d/e/1FAIpQLScCSWYlzouT8pzhfl0A2xdA0BxAPYg75h9F-WNkN8XuowpstA/viewform?usp=dialog)- [https://forms.gle/Pi1pGLuS1FmzXoLr6](https://forms.gle/Pi1pGLuS1FmzXoLr6)_

---

Every day, there is news about a massive fundraising round for a new AI startup, a new data center/infra buildout, investment in a new model, or a new billion-dollar model drop. At the same time, when one sees millions going to startups with no revenue or differentiation and a complete lack of rationality in the AI discourse, one can’t help but draw parallels to the Dot Com Bust or 2008 Crisis. In both cases, the larger underlying category might have been solid (internet stocks recovered to rule the world within 20 years), but people lost a lot of money because they picked the wrong horse. And in an ecosystem with so much hype, false promises, and ignorance (and a stunning lack of profit or sustainability)— there is bound to be a violent resetting of the market as people misprice strutural inefficiencies.

[

![](https://substackcdn.com/image/fetch/$s_!Kt8w!,w_2400,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fcac2e277-72a0-4bb5-9a90-c857a1c06d26_1448x1086.png)



](https://substackcdn.com/image/fetch/$s_!Kt8w!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fcac2e277-72a0-4bb5-9a90-c857a1c06d26_1448x1086.png)

All this leads us to an interesting question: when this market correction happens, which players are the safest and which billion-dollar horses are going to get swept in the current? This question gets more interesting when you see two very contradictory markets forces, which force the market in two very different futures. On one side, we see data like:

- Three years ago, GPT-4 cost [$30 per million input tokens and $60 per million output tokens](https://developers.openai.com/api/docs/models/gpt-4?utm_source=chatgpt.com). Today, Gemma 4 E4B [scores the same 7 on Artificial Analysis’s Intelligence Index while costing roughly $0.02 in and $0.10 out](https://artificialanalysis.ai/models/gemma-4-e4b-non-reasoning?utm_source=chatgpt.com). Using a simple 3:1 input/output blend, that takes us from about **$37.50 to $0.04 per million tokens**.
    
- In other words, the same band of intelligence got roughly **940× cheaper**.
    
- More recently, the exceptionally hyped JEV has been making the rounds for its cost, speed, and “no hallucination” guarantees. Instead of using a general-purpose LLM for every problem, it targets narrower structured decisions, where TypeSafe reports [up to 193.6× faster and 444.6× cheaper performance on its evaluated workflows](https://typesafe.ai/blog/introducing-system-one-models-and-jev?utm_source=chatgpt.com).
    
- The homegrown open-source research we’ve done in our community all focuses on driving down the cost of AI through structure w/ Stateful Swarms (beat costly models with a cheap, non-thinking model by building a better reasoning infra), Latent Reasoning (help a frozen, pretrained model reason better by exploring their latents better) or fractal embeddings (using geometry to organize information more efficiently).
    

In other words, everyone building and buying on AI trying to make AI cheaper. So far, so good; nothing groundbreaking. However, several major companies are making enormous bets on the opposite side of that equation with Alphabet, Amazon, Meta, Microsoft, and Oracle expected to spend roughly [$750 billion on capex in 2026 (around 38% of their combined revenue](https://www.spglobal.com/ratings/en/regulatory/article/creditweek-will-rising-capex-test-hyperscalers-credit-strength-s101685676?utm_source=chatgpt.com)). Increasingly, that infrastructure is sitting behind multi-year customer contracts, debt, leases, guarantees, and other financing structures.

This creates two possible outcomes:

- **Compute demand grows faster than efficiency.** Great. More intelligence gets consumed, the infrastructure stays busy, and the spending will create induced demand that will generate ROI.
    
- Or **the downwards pressure causes a collapse.** That does not require AI demand to collapse **since compute can keep growing while prices fall, workloads move, new hardware arrives, customers renegotiate, or a supposedly valuable asset simply earns less than expected (like with Vector DBs which never captured the market people expected them to)**.
    

If the latter happens, it will cause a massive correction given how many people are betting their money on assumptions about what compute will be worth several years from now.

Given all that, it’s worth asking: _when the correction happens, who actually takes the risk ?_After all, even if AI as a whole will boom, different pricing structures, different parts of the stack, and different companies Even if the internet took off, the growth of Pets.com, Cisco, and Amazon were very different.

[

![](https://substackcdn.com/image/fetch/$s_!rgSp!,w_2400,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F9d87dfbc-2589-4760-843f-3c95d64c29a2_1491x1055.png)



](https://substackcdn.com/image/fetch/$s_!rgSp!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F9d87dfbc-2589-4760-843f-3c95d64c29a2_1491x1055.png)

So I went through the financing structures, contracts, and guarantees behind the AI infrastructure boom to answer three questions:

- **Who is most exposed?**
    
- **Who is better protected than they look?**
    
- **And where has the risk quietly moved instead?**
    

This exploration produced a comprehensive report of the various players in the AI Industry, what risks they’re taking, what they need to succeed, how vulnerable they are to industry shocks, and what kinds of developments would hurt them the most. Below is a preview of the findings—

[

![](https://substackcdn.com/image/fetch/$s_!CCv8!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F81f76b68-af3d-41e3-b568-357c3933fdb5_992x1586.png)



](https://substackcdn.com/image/fetch/$s_!CCv8!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F81f76b68-af3d-41e3-b568-357c3933fdb5_992x1586.png)

Behind the paywall, we will dig very deep into the financing structures, AI research trends, and regulatory pressures to help us answer questions above. We will visit each aspect of the stack, look at how it interacts with all the others, and ultimately try to figure out how we can spot any cracks or breaking events before they blow up in our face. Keep reading if that interests you—

[

![](https://substackcdn.com/image/fetch/$s_!-157!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F84e9ffad-276c-423e-9c4c-7652a01d219e_555x182.png)



](https://substackcdn.com/image/fetch/$s_!-157!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F84e9ffad-276c-423e-9c4c-7652a01d219e_555x182.png)

## TL;DR

- **NeoClouds / GPU renters:** This layer looks dangerously exposed because these companies own expensive hardware that could depreciate quickly. But the immediate risk is often lower than it looks because much of the capacity is sold through long-term take-or-pay contracts. If compute prices fall tomorrow, the customer may still be stuck paying yesterday’s price. The real problem comes later: if the customer contract ends before the debt used to finance the GPUs does, the NeoCloud suddenly has to refinance, find another customer, or accept whatever price the hardware can command in the new market. CoreWeave is the cleanest example of this. Its structure shows that risk is often not eliminated—it is merely delayed. The key variables here are renewal pricing, customer concentration, residual GPU value and how much debt is still outstanding when the protection from the original contract disappears.
    
- **Chipmakers:** Nvidia, Broadcom and others still sit in one of the strongest parts of the stack because they get paid for selling the hardware rather than waiting years for the compute to generate revenue. But that clean “sell shovels during a gold rush” model is starting to change. Chipmakers are increasingly helping finance deployments, guaranteeing capacity, supporting customers and effectively using their own balance sheets to create more demand for the products they sell. That is strategically rational: if supporting a customer unlocks tens or hundreds of billions in future hardware sales, some credit risk may be worth taking. But it also means that risk which looked like it had been pushed downstream can eventually travel back upstream. The normal danger is not simply that compute gets cheaper; the more serious tail scenario is that large customers fail at the same time that the assets or capacity supporting those guarantees become harder to resell.
    
- **Hyperscalers:** For this layer, the problem increasingly moves from **demand risk to ROI and counterparty risk.** Oracle, Google and others already have enormous amounts of future cloud demand contracted. The harder question is what they must spend today to serve that demand, how profitable those contracts actually become, and whether the customers promising to pay years from now can still pay when the bill arrives. Oracle shows the aggressive version of this trade: huge backlog, huge capex, heavy financing needs and meaningful dependence on companies like OpenAI becoming dramatically larger businesses. Google shows the opposite end: similarly enormous spending, but backed by a much stronger existing cash engine and balance sheet. That difference matters because two companies can make equally large AI bets while having completely different abilities to survive being wrong.
    
- **Data-center builders / landlords:** This part of the stack is less exposed to which specific model, chip or architecture wins because the underlying assets—power, cooling, land, grid access and buildings—should survive multiple generations of hardware. That makes the landlord layer look relatively durable once a facility is built and occupied. The risk is concentrated elsewhere: billions often have to be spent before years of rent start arriving, which creates major construction, financing and execution risk. Then, once the facility is live, the key question becomes less “what happens if GPU prices fall?” and more **“who signed the lease, and will they still be able to pay it?”** Long-term contracts reduce market-pricing risk, but they can convert it into customer-concentration risk. A beautiful 15-year lease is much less beautiful if most of the economics depend on one tenant whose own business requires another financing round.
    
- **Lenders / private credit:** The debt financing this boom is not one homogeneous pile of risk. Some lenders are extremely well protected: they may have first claims on customer payments, collateral underneath them, cash trapped inside the project, covenants forcing early repayments and equity holders absorbing losses before they do. Others are taking much more direct exposure to future GPU values, contract renewals or the survival of the borrower itself. The same company can therefore borrow at very different prices depending on where the lender sits and what protections exist. The deeper systemic issue is even more interesting: a CoreWeave loan, an Applied Digital lease, an Nvidia guarantee and an Oracle contract may all look like separate exposures, but they can ultimately depend on the same handful of AI labs continuing to raise money and consume enormous amounts of compute. On paper the capital looks diversified; underneath it, the same risk may be repeated several times.
    
- **Model labs:** Eventually, every layer in the stack runs into the same endpoint: **somebody has to make enough money from AI to pay everyone else.** The model labs are where that question becomes unavoidable. Demand is clearly real, and usage is growing very quickly, but the infrastructure commitments being made today are often much larger than the current businesses supporting them. OpenAI makes this tension obvious: the company is growing fast, but its future compute commitments and expected cash burn assume continued revenue growth and continued access to outside capital for years. If the model labs successfully grow into these commitments, a lot of scary-looking infrastructure bets become perfectly reasonable. If their growth slows, fundraising becomes harder, or pricing collapses faster than usage expands, the weakness does not stay contained inside the lab—it can travel into the hyperscalers, NeoClouds, landlords, chipmakers and lenders that built around its expected future demand.
    

_PS: For this article, we’ll use individual companies as examples, but **the point is not to judge CoreWeave, Nvidia, Oracle, OpenAI, etc. one by one.** The point is to understand the different units of the AI stack, what risks each one carries, what protects them, and—most importantly—how those risks move between them. Follow-up pieces will go much deeper on individual companies so we can give each one its due importance, understand how it interacts with the rest of the stack, and separate what is actually working from what merely looks good on paper._

[Share](https://www.artificialintelligencemadesimple.com/p/the-ai-bubble-isnt-where-you-think?utm_source=substack&utm_medium=email&utm_content=share&action=share&token=eyJ1c2VyX2lkIjoxMjg0OTEyOSwicG9zdF9pZCI6MjE2NzI5NzA4LCJpYXQiOjE3OTA2MTQ1NDgsImV4cCI6MTc5MzIwNjU0OCwiaXNzIjoicHViLTEzMTUwNzQiLCJzdWIiOiJwb3N0LXJlYWN0aW9uIn0.HZ7m4EEDq6_j1owHIcAh3BeUiNTEtOKrFZSIK-06Ce4)

_**Want access to a repository containing all of our research? 300+ files containing our notes of various experiments, discussions with cutting-edge teams, and insights into where the industry is headed next. Get a Founding Member Subscription to AI Made Simple.** Want to talk to me for details/get my insights into the tech ecosystem? [Reach out to me through any of my socials over here](https://linktr.ee/iseethings404) or reply to this email._

## NeoClouds/GPU Rentals: The First to Fall in the AI ?

### CoreWeave — Risk Profile

**Overall:** **Low near-term pricing risk; high funding and renewal risk.** CoreWeave is protected while customers remain locked into contracts, but it still needs huge amounts of outside capital and becomes much more exposed when those contracts expire.

- **Near-term pricing risk: Low.** 98% of Q2 revenue came from committed contracts, so a sudden drop in compute prices does not immediately hit current revenue.
    
- **Funding risk: Very high.** CoreWeave generated about **$3.7B of operating cash in H1 while spending $14.1B on infrastructure**, meaning its current growth still depends heavily on debt, customer prepayments and fresh capital.
    
- **Why lenders tolerate the leverage:** CoreWeave has roughly **$103.7B of contracted future revenue against ~$35.6B of debt, or ~2.9×**. While that revenue still has to fund GPUs, power, leases and interest, the size of the contracted base explains why lenders are willing to underwrite so much debt: if the growth arrives as promised, there is plenty of future revenue to support it.
    
- **Renewal risk: High.** Some financing lasts longer than the customer contracts supporting it, so if compute is materially cheaper when those contracts expire, CoreWeave may have to accept weaker pricing, refinance, pay debt down faster or inject more capital.
    
- **Customer risk: Very high.** The top three customers represent **72% of revenue**, so the same long contracts that protect CoreWeave from pricing changes also make the health of a few customers unusually important.
    
- **Who gets hurt first:** probably **equity before lenders**, since covenants, collateral and forced debt repayments give lenders protection before they start taking losses.
    

**The bet:** customers keep paying long enough for CoreWeave to recover its huge upfront investment, while future contracts remain strong enough to support whatever debt is left.

**What to watch:** renewal pricing, debt remaining when contracts expire, customer health and whether CoreWeave can eventually fund more of its capex internally.

### Understanding the Business of NeoClouds

A common mistake people make is to assume whoever owns the GPUs is taking the biggest risk. While this simplification is true at time, it’s wrong more often due to the complicated nature of compute contracts. Imagine a simplified scenario where two companies build exactly the same $1 billion GPU cluster: Company A rents it out on-demand; Company B signs a customer to pay a fixed price for three years.

If compute prices fall 40%—

- Company A gets hit almost immediately. Customers move to cheaper capacity or ask for lower prices.
    
- Company B is in a very different position since the customer is already locked into the contract until the end of the period.
    

This simplified scenario is playing out IRL right now.

CoreWeave sells both on-demand capacity and committed contracts, but [98% of its revenue in Q2 came from customer commitments](https://www.sec.gov/Archives/edgar/data/1769628/000176962826000366/crwv-20260630.htm). These committed contracts are generally take-or-pay, meaning the customer commits to paying for the capacity whether they end up using all of it or not. Customers have also historically prepaid [around 15–25% of the total contract value](https://www.sec.gov/Archives/edgar/data/1769628/000176962826000366/crwv-20260630.htm). These commitments insulate all parties from risk (customers get some capacity locked so they can plan ahead (**and remember that uncertainty is often costlier than payments**) while CoreWeave gets to show revenue).

[

![](https://substackcdn.com/image/fetch/$s_!Z7QI!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ff74e9873-7df1-4d51-8e13-4ada1a0d5ba2_1448x1086.png)



](https://substackcdn.com/image/fetch/$s_!Z7QI!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ff74e9873-7df1-4d51-8e13-4ada1a0d5ba2_1448x1086.png)

Therefore, if the market price of compute drops next year, it will be the customer, not CoreWeave that eats the brunt of the loss (of course, this protection only lasts as long as the contract does; after which CW will have to deal with this loss in asset).

But financing contracts IRL make the whole situation much more interesting than just this. CoreWeave recently raised a [$2.6 billion financing facility with a roughly five-year maturity](https://www.sec.gov/Archives/edgar/data/1769628/000176962826000357/ex991pr.htm), while the customer contracts supporting it average roughly **three years**. In other words, the customer pays CoreWeave for three years while the debt lasts around five.

[

![](https://substackcdn.com/image/fetch/$s_!3LSd!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd1d8cb48-359f-4a03-b041-d2164a7251a5_1448x1086.png)



](https://substackcdn.com/image/fetch/$s_!3LSd!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd1d8cb48-359f-4a03-b041-d2164a7251a5_1448x1086.png)

If the market still loves those GPUs three years from now, no problem. CoreWeave renews the customer, finds somebody else, or refinances the remaining debt.

**But** if compute has gotten much cheaper, newer hardware has changed the economics, or customers simply refuse to sign contracts at the same price, there is now a gap between the revenue CoreWeave originally locked in and the debt that still needs to be serviced. That can cause some serious problems.

So then are the true people at risk the financiers of this boom? Not completely, since the actual financing has minimum coverage requirements, collateral, a parent guarantee, and mechanisms that can force CoreWeave to pay down debt if suitable replacement contracts are not signed. The [facility requires at least 1.35× debt-service coverage](https://www.sec.gov/Archives/edgar/data/1769628/000176962826000357/crwv-20260807.htm), while the underlying credit agreement contains specific provisions around contract renewals and debt reduction.

So once again the risk shifts to another place in the stack. Hopefully you’re starting to understand how complicated these massive buildouts get, and why simplistic boom/bubble narratives create incomplete pictures of the situation. In this current profile, the risk gets redistributed to something like this:

- The customer might first be stuck paying above-market prices.
    
- CoreWeave might then take the hit when that contract expires.
    
- If CoreWeave has to inject cash or repay debt early, equity holders may feel it before lenders do.
    
- Only after those protections fail do creditors start worrying about whether the GPUs and other collateral are actually worth enough to recover their money.
    

A lot of media headlines tend to focus on leverage, but cases like this are why it can often be a “faux ami” (false friend; when I studied French, this was the term for words that looked like English words but meant something else; such as travailler, which means to work, not to travel as one might expect). A heavily indebted company with long customer commitments can sometimes be better protected against a short-term pricing shock than a lightly indebted company selling everything month-to-month.

The opposite is also true. A giant backlog can look wonderfully safe until you notice that the debt lasts longer than the contract, the customer base is concentrated, or the company has to keep spending heavily just to replace old hardware and deliver what it promised. This is one of the reasons why people suddenly turned on Oracle a few months ago, since fulfilling the backlog required them to spend a lot of money they did not have to serve customers who might not make it past 2 years.

[

![](https://substackcdn.com/image/fetch/$s_!UCsm!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F1f309b4b-04bc-4fc2-af4f-2ee405b95c52_1456x1068.webp)



](https://substackcdn.com/image/fetch/$s_!UCsm!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F1f309b4b-04bc-4fc2-af4f-2ee405b95c52_1456x1068.webp)

[](https://www.artificialintelligencemadesimple.com/p/the-ai-industry-is-going-through)

[

![The AI Industry is Going Through a Massive Correction](https://substackcdn.com/image/fetch/$s_!Lriz!,w_140,h_140,c_fill,f_auto,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F85ccf27e-3c4d-49eb-bfec-0731fb174570_2088x1358.png)

](https://www.artificialintelligencemadesimple.com/p/the-ai-industry-is-going-through)

[

#### The AI Industry is Going Through a Massive Correction

](https://www.artificialintelligencemadesimple.com/p/the-ai-industry-is-going-through)

[](https://www.artificialintelligencemadesimple.com/p/the-ai-industry-is-going-through)

[](https://www.artificialintelligencemadesimple.com/p/the-ai-industry-is-going-through)[Devansh](https://substack.com/profile/8101724-devansh)

·

Jul 16

[

Read full story

](https://www.artificialintelligencemadesimple.com/p/the-ai-industry-is-going-through)

For investors, there are therefore a few very different kinds of risk hiding under the phrase “AI infrastructure risk”:

- **Pricing risk:** what happens when the market price of compute falls?
    
- **Utilization risk:** what happens when the capacity simply sits unused?
    
- **Customer risk:** what happens when the person who promised to pay cannot—or finds a way not to?
    
- **Renewal risk:** what happens when the protected period ends?
    
- **Financing risk:** what happens if the debt is still there when the protection disappears?
    

With different players carrying different combinations of those risks. This is also why there are some companies that look very safe on paper, but a deeper look at their contracts tells us that they have functionally guaranteed enough of the deal that the risk comes straight back to them anyway.

[

![](https://substackcdn.com/image/fetch/$s_!nIJN!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F78f36a4b-306e-4222-8400-612f1c1f903a_1448x1086.png)



](https://substackcdn.com/image/fetch/$s_!nIJN!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F78f36a4b-306e-4222-8400-612f1c1f903a_1448x1086.png)

Let’s play with that idea next.

## Chipmakers: Even the “safe” players are taking risk

## Nvidia / Broadcom — Risk Profile

**Overall:** **Low risk in a normal AI slowdown; meaningful tail risk if major customers actually fail.** Unlike CoreWeave, these companies can absorb much more pain before the balance sheet becomes a problem, but they are increasingly putting their own capital behind the demand they sell into.

### Broadcom

- **Maximum backstop: ~$29B.** The headline is scary, but Broadcom only gets close to that loss if the customer defaults **and** the financed racks recover almost no value.
    
- **50% recovery stress case:** roughly **$12B of exposure**, or about **27% of annualized operating cash flow**. Painful, but nowhere near existential.
    
- **Normal compute-price risk: Low.** A 30% drop in compute prices does not automatically cost Broadcom billions; the real problem is **customer failure plus weak asset recovery**.
    
- **Why take the risk:** helping customers finance large deployments locks Broadcom hardware into those systems, so it is effectively using its balance sheet to create future chip demand.
    

**The bet:** the extra hardware revenue is worth carrying some tail credit risk.

### Nvidia

- **Maximum disclosed OpenAI/SB Energy guarantee: ~$105B.** This is a ceiling, not a likely loss: the guarantee phases in, declines over time, has recovery/reletting options, and OpenAI has agreed to reimburse Nvidia for payments.
    
- **50% recovery stress case:** roughly **$52.5B of gross exposure**, around **35% of Nvidia’s annualized operating cash flow**. Very large, but still absorbable by the current business.
    
- **Normal AI correction: Low direct risk.** Nvidia does not need GPU rental prices to stay high for this structure to work; it needs something much worse—major customers failing while replacement demand and asset values are also weak.
    
- **Why take the risk:** Nvidia estimates one generation of the Ohio infrastructure could generate roughly **$150–200B of Nvidia revenue**, so using its balance sheet to unlock orders of that size is fairly easy to understand.
    

**The bet:** Nvidia can use its balance sheet to expand the compute market while only taking serious losses in a much deeper industry failure.

## Understanding the Business

At first glance, the safest place to sit in an AI boom should be upstream; the the classic “sell shovels during a gold rush” trade. Nvidia or Broadcom get paid to sell the chips here and now, so if their customer pulls the wrong monopoly card and goes bankrupt, it’s really not their problem. Was true when your friend Jimmy bought GPUs for day trading; was true when you saw too many influencer courses and bought GPUs for crypto; and it’s true now when Elon Musk and Sam Altman are robbing your grandma’s pension fund ([this is actually happening, see more here](https://www.artificialintelligencemadesimple.com/p/how-elon-musk-found-is-about-to-steal?utm_source=publication-search)) while projecting their 30 trillion-dollar fantasies.

[

![](https://substackcdn.com/image/fetch/$s_!Fjzn!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fbf763b5c-8f3f-4280-b9d5-ba4714355ab5_1400x850.png)



](https://substackcdn.com/image/fetch/$s_!Fjzn!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fbf763b5c-8f3f-4280-b9d5-ba4714355ab5_1400x850.png)

However, in our case, the shovel sellers have started helping finance the miners.

Earlier this year, Broadcom launched an **[$35 billion AI financing platform](https://www.sec.gov/Archives/edgar/data/1730168/000173016826000080/avgo-20260802.htm)** where a financial partner buys racks built around Broadcom’s custom AI accelerators and leases that compute to a customer. This lets the customer deploy far more infrastructure without Broadcom itself having to fund the entire buildout upfront.

[

![](https://substackcdn.com/image/fetch/$s_!SbTE!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F9175e55b-e1bc-48ae-bb58-6115636678e5_1448x1086.png)



](https://substackcdn.com/image/fetch/$s_!SbTE!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F9175e55b-e1bc-48ae-bb58-6115636678e5_1448x1086.png)

Great business if everything works. The partner can scale their ops with funding, while Broadcom ultimately ensures the money flows back to them by ensuring their infra is embedded within people. For a more relatable example, look at how Clouds give an insane amount of credits and migration support to startups, so that they end up building on their clouds.

However, if the customer defaults, Broadcom can be responsible for the difference between **85% of the remaining lease obligation and whatever the AI racks can be sold for**, with its maximum potential liability reaching roughly **[$29 billion once all the racks are deployed](https://www.sec.gov/Archives/edgar/data/1730168/000173016826000080/avgo-20260802.htm)**. This is only the worst case, and Broadcom says the current fair value of that guarantee is immaterial, so this is obviously not the same thing as Broadcom having a $29 billion loss sitting somewhere. But the structure is interesting because it shows how the risk can make a full circle.

[

![](https://substackcdn.com/image/fetch/$s_!WSew!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F9f934559-0e58-4db1-9062-53391fd98ddf_1448x1086.png)



](https://substackcdn.com/image/fetch/$s_!WSew!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F9f934559-0e58-4db1-9062-53391fd98ddf_1448x1086.png)

When it comes to scaling this play, no one has run it better than Nvidia. As of July, they had **[$36 billion of commitments to AI cloud providers](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000075/nvda-20260726.htm)**, generally over six years. The cloud providers can sell that capacity to third parties, which reduces Nvidia’s commitment, but if they cannot sell it, Nvidia has agreed to purchase the capacity itself.

**In other words, Nvidia is not just selling the GPUs. In some cases, it is also helping guarantee that somebody will actually consume the compute produced by them.**

This gets much bigger with OpenAI. Nvidia recently agreed to provide credit support for roughly 4.25 GW of infrastructure being built for OpenAI at SB Energy’s Ohio campus, with its **[maximum guarantee capped at $105 billion](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000069/nvda-20260817.htm)**. These guarantees phase in as the data centers actually enter service and can run for as long as the underlying 20-year leases. If OpenAI defaults or becomes insolvent, Nvidia might have to end up covering part of the shortfall (_although OpenAI has agreed to reimburse Nvidia for payments it makes; I wonder if we’re going to see people trading debts and predictions on these debts on the markets since different people might price the OpenAI guarantee w/ differing degrees of belief_).

You might be wondering **why Nvidia is willing to take the risk at all**.

[

![](https://substackcdn.com/image/fetch/$s_!DEGw!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd97d4d96-37ba-4de4-a73f-c2d3d0ac764e_1448x1086.png)



](https://substackcdn.com/image/fetch/$s_!DEGw!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd97d4d96-37ba-4de4-a73f-c2d3d0ac764e_1448x1086.png)

The cynic in me points to the fact that Nvidia’s run and dominance in the market are directly dependent on GPU demand + scarcity, so they might as well risk it all to make sure the market keeps expanding. Game theory-wise:

1. If Nvidia does nothing and the market contracts, they crash.
    
2. If Nvidia does nothing and the market expands, they lose their position to a bunch of others.
    
3. If Nvidia does something and the market crashes, then while they might lose some money, they have the underlying profits to survive.
    
4. If Nvidia does something and the market expands, then Daddy Jensen gets to buy more leather jackets.
    

Out of all the somethings they can do, funding multiple downstream players is the most effective way to ensure that the demand for compute continues to expand, even if a few companies/sectors get wiped out. In an ideal world, they would have a strong consumer base wanting to buy their GPU laptops/micro data centers etc to so they had another possible avenue to invest in instead of only having to fund huge buildouts, but Nvidia’s (and pretty much all the chip guys’) diffusion into the mind of the average Joe has been quite poor (especially compared to their market cap). So for now, they have to keep making these big bets instead of diffusing capital across lots of little ones.

This lack of avenues to directly invest their capital is also why AMD, Nvidia, and other compute guys tend to be so active in the open-source space, since that is atleast is a reliable indrect way to facilitate compute expansion ([more details about their strategy, and how other AI Model Makers are Planning to make money here](https://www.artificialintelligencemadesimple.com/p/how-will-ai-models-make-money)).

[

![](https://substackcdn.com/image/fetch/$s_!hJXe!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F78cee519-9a0c-4b94-9b6c-10919196efb2_1448x1086.webp)



](https://substackcdn.com/image/fetch/$s_!hJXe!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F78cee519-9a0c-4b94-9b6c-10919196efb2_1448x1086.webp)

Nvidia’s more PR friendly spin on this is that they estimate that each generation of infrastructure deployed at this Ohio campus could represent roughly **[1.5 million Nvidia GPUs and $150–200 billion of Nvidia revenue](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000073/q2fy27cfocommentary.htm)**. Given that the 105 invested is not being invested all at once (and it will likely have various tranches with backouts/optionality) the numbers look good. Personally, I’m skeptical of their projections, but who am I to question a company with millionaire janitors.

All that to say, in our current system, even what would have once been considered safe bets are starting to load some risks onto themselves. This might not be bad since Nvidia has the huge margins and a much stronger balance sheet to support companies trying to build infrastructure around its chips, so using that balance sheet to unlock more demand can be one of the best things it can possibly do.

If AI demand keeps exploding, almost none of this matters and Nvidia simply sold more chips because it helped the ecosystem build faster.

But If the underlying customers weaken, capacity becomes harder to sell, or the assets backing these deals end up worth far less than expected, then the same companies that looked like they had neatly passed all of that risk downstream can discover that they guaranteed enough of the transaction for part of it to come straight back.

## Hyperscalers — the risk moves from demand to ROI

### Oracle — Risk Profile

**Overall: Low demand risk; very high funding + counterparty risk.** Oracle has already sold an enormous amount of future compute, but now it has to build the infrastructure and trust that the customers promising to pay for it will actually be able to.

- **Backlog looks incredible:** Oracle has [$664B of RPO, but only 13% is expected to become revenue over the next 12 months](https://www.sec.gov/Archives/edgar/data/1341439/000119312526389274/orcl-20260831.htm?utm_source=chatgpt.com), so most of that number is still several years away.
    
- **OpenAI is the elephant in the room:** the reported Oracle/OpenAI relationship is worth [more than $300B over five years](https://openai.com/index/five-new-stargate-sites/?utm_source=chatgpt.com), roughly 45% of Oracle’s current RPO in scale. That does not mean every dollar maps directly into today’s backlog, but it shows how dependent Oracle’s AI story has become on a very small number of enormous counterparties.
    
- **And OpenAI cannot pay for that from today’s business:** it is projected to generate roughly [$36B of revenue in 2026 while burning almost $280B of cash through 2030](https://www.reuters.com/technology/openai-expects-burn-through-almost-280-billion-by-2030-ft-reports-2026-09-18/?utm_source=chatgpt.com). A $300B five-year Oracle commitment averages ~$60B/year, so honoring it requires OpenAI to keep growing and raising capital at an extraordinary rate.
    
    [
    
    ![](https://substackcdn.com/image/fetch/$s_!T8V7!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fbad2c9d5-5ab2-4782-bcac-3eaf3c08d248_1448x1086.png)
    
    
    
    ](https://substackcdn.com/image/fetch/$s_!T8V7!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fbad2c9d5-5ab2-4782-bcac-3eaf3c08d248_1448x1086.png)
    
- **Funding risk is already visible:** Oracle spent [$28.5B on capex against $23.1B of operating cash flow last quarter, with $11.4B of that cash flow coming from customer prepayments](https://www.sec.gov/Archives/edgar/data/1341439/000119312526389274/orcl-20260831.htm?utm_source=chatgpt.com). It also raised [$19.9B of fresh equity during the quarter](https://www.sec.gov/Archives/edgar/data/1341439/000119312526389274/orcl-20260831.htm?utm_source=chatgpt.com).
    
- **Balance-sheet cushion:** Oracle carries roughly [$125B of borrowings against ~$37B of cash + marketable securities](https://www.sec.gov/Archives/edgar/data/1341439/000119312526389274/orcl-20260831.htm?utm_source=chatgpt.com), or about **3.4× debt/liquidity**.
    
- **One important protection:** large AI contracts include about [$75B of customer prepayments or customer-supplied hardware](https://www.oracle.com/news/announcement/q4fy26-earnings-release-2026-06-10/?utm_source=chatgpt.com), which shifts part of the buildout cost back onto the customers.
    

**The bet:** Oracle is betting twice—first that AI demand keeps growing, and second that customers like OpenAI grow/fundraise fast enough to actually pay for the compute they have already promised to buy.

**What breaks first:** customer funding weakens → Oracle carries more of the buildout → free cash flow, dilution and debt get worse.

**Risk:** Demand **1/5** | Funding **5/5** | Counterparty **5/5** | Balance sheet **4/5**

### Google — Risk Profile

**Overall: Similar spending, much stronger shock absorption.** Google is also spending absurd amounts on AI infrastructure, but the existing business gives it considerably more room to be wrong.

- **Cloud demand is already real:** Google Cloud had [$513.9B of backlog at June-end](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000071/goog-20260630.htm?utm_source=chatgpt.com), with more than half expected to convert into revenue within 24 months.
    
- **The business already makes serious money:** Google Cloud produced [$24.8B of Q2 revenue and $8.8B of operating income](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000071/goog-20260630.htm?utm_source=chatgpt.com), roughly a **36% operating margin**.
    
- **Capex is still wild:** Alphabet spent [$80.6B in H1 capex against $84.9B of operating cash flow](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000071/goog-20260630.htm?utm_source=chatgpt.com), so even Google is currently reinvesting almost everything it generates into infrastructure.
    
- **But its cushion is completely different:** Alphabet has roughly [$242.5B of cash + marketable securities against $98.2B of long-term debt](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000071/goog-20260630.htm?utm_source=chatgpt.com), or about **2.5× more liquid assets than long-term debt**.
    

**The bet:** AI infrastructure produces returns good enough to justify tying up this much of Google’s cash.

**What breaks first:** free cash flow and returns on capital, not Google’s ability to finance itself.

**Risk:** Demand **1/5** | Funding **2/5** | ROI/overbuild **3/5** | Balance sheet **1/5**

## Understanding the Business

The hyperscalers are spending enormous amounts today because customers have promised to buy enormous amounts of cloud tomorrow. This would not be an issue in your average business environment, but creates an interesting problem in the AI ecosystem: _**given how many AI startups (hyperscaler customers) are expected to go under (no profits, bad unit economics) AND how the buildout assumes that the startups will actually GROW their usage (not just maintain it), how valuable are those promises, and how much money do you have to spend before you can collect them?**_

Take Oracle. Its rise to AI Royalty has been on the back of their aggressive buildout around their [$664B of contracted future revenue](https://www.sec.gov/Archives/edgar/data/1341439/000119312526389274/orcl-20260831.htm?utm_source=chatgpt.com). Them is some good numbers, until you look at who is signing some of those contracts. The OpenAI relationship alone is [worth more than $300B over five years](https://openai.com/index/five-new-stargate-sites/?utm_source=chatgpt.com), while OpenAI itself expects to [burn almost $280B through 2030](https://www.reuters.com/technology/openai-expects-burn-through-almost-280-billion-by-2030-ft-reports-2026-09-18/?utm_source=chatgpt.com). OpenAI obviously expects its revenue to explode from here, but that is precisely the point: **part of Oracle’s backlog is effectively a bet on OpenAI successfully becoming the company OpenAI says it will become.**

I guess if I want to become a billionaire, I should just have someone from my jacuzzi club write me an IOU for it.

[

![](https://substackcdn.com/image/fetch/$s_!DS5Q!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fab5b0fc1-fa7e-411a-9bbf-c0cee42955e1_1491x1055.png)



](https://substackcdn.com/image/fetch/$s_!DS5Q!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fab5b0fc1-fa7e-411a-9bbf-c0cee42955e1_1491x1055.png)

This is why Oracles stock has been interesting to watch this year. They had a meteoric rise since the markets reacted positively to them locking in customers to long term deals. Then people started asking about whether these customers could actually pay these commitments. And that’s where things got murky. Investors couldn’t independently verify the ultimate margins, utilization, cancellation risk, or counterparty durability embedded in $638B of long-dated contracts. They can verify $55.7B of capex, negative free cash flow, and another enormous financing requirement. So credit priced what it could see and on _**July 9, [S&P downgraded Oracle from BBB to BBB-, one notch above junk](https://www.spglobal.com/ratings/en/regulatory/article/-/view/type/HTML/id/3592348). S&P said Oracle’s expanding AI infrastructure business was weakening its traditional business-risk profile and admitted that it had underestimated how much investment the buildout would require.**_

[

![](https://substackcdn.com/image/fetch/$s_!sq_z!,w_2400,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F109102bd-e6a1-46bb-95d6-cb48c35703be_1456x947.webp)



](https://substackcdn.com/image/fetch/$s_!sq_z!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F109102bd-e6a1-46bb-95d6-cb48c35703be_1456x947.webp)

To their credit, Oracle has reduced some of that burden through [customer prepayments and customer-supplied hardware](https://www.oracle.com/news/announcement/q4fy26-earnings-release-2026-06-10/?utm_source=chatgpt.com), but somebody eventually still has to generate enough money to pay the bill for their massive buildout and then continue to use it for a long time to be useful.

To understand the opposite ends of this spectrum, we can look at Google, which has a similar cloud business and aggressive expansion strategy, but a much more lower overall risk. Google Cloud also has [more than $500B of backlog](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000071/goog-20260630.htm?utm_source=chatgpt.com) and Alphabet spent [$80.6B on capex in six months](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000071/goog-20260630.htm?utm_source=chatgpt.com), but Google Cloud is already running at roughly [36% operating margins](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000071/goog-20260630.htm?utm_source=chatgpt.com) while Alphabet sits on roughly [$242.5B of liquid assets](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000071/goog-20260630.htm?utm_source=chatgpt.com). Oracle has roughly [$125B of borrowings against $37B of liquidity](https://www.sec.gov/Archives/edgar/data/1341439/000119312526389274/orcl-20260831.htm?utm_source=chatgpt.com) and is already using customer prepayments, debt and fresh equity to fund the infrastructure required to fulfil what it sold.

[

![](https://substackcdn.com/image/fetch/$s_!b0H-!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fb6d33b44-f16a-4e7f-ad22-30054a087bb6_1491x1055.png)



](https://substackcdn.com/image/fetch/$s_!b0H-!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fb6d33b44-f16a-4e7f-ad22-30054a087bb6_1491x1055.png)

From an aesthetic standpoint, I have a soft spot for Oracle’s approach to things. They were kind of a forgotten tech company in the tech ecosystem, so instead of pulling an IBM and living in mediocrity, they’ve decided to go all in on this AI Buildout. They might not make it, but atleast for a brief moment they get to shine with the big boys. There is something so romantic in there.

A company like Google doesn’t need to do the wallstreetbets style gamble because they were at the top before this buildout, but they have their own problems to deal with. They’re expected to be great on all fronts, all while dealing with the complacency and internal politics present in big companies. This can create a lot of distractions and tug of war, leading to loss of market opportunity. This is something that we are seeing with Google, more when we cover them.

For now, we continue our journey along the risk map to look at the next destination. This group of characters is often overlooked in AI Industry discussions, but they do play a very important role.

# What are the Risks for AI Data Centers Builders

### Applied Digital— Risk Profile

**Overall: Low direct compute risk; high construction + counterparty risk.** If GPUs get cheaper tomorrow, Applied Digital’s rent does not suddenly reprice; the bigger risk is spending billions before the buildings are ready, then depending on tenants to keep paying for 15 years.

- **Contract protection: Strong.** Applied Digital has [1.41 GW under long-term leases worth roughly $36.2B over the initial 15-year terms](https://www.sec.gov/Archives/edgar/data/1144879/000114487926000048/apld-20260531.htm?utm_source=chatgpt.com), with about **70% of contracted revenue backed by investment-grade hyperscalers**. The leases are take-or-pay and non-cancellable; walking away for convenience requires paying the remaining contractual value.
    
- **Project economics: Attractive if the tenants pay.** Polaris Forge 1 costs roughly **$11–13M/MW** to build and has 400 MW leased to CoreWeave for about **$11B over 15 years**, with expected site NOI margins around **88% ±3%**. [That implies roughly $4.4–5.2B of capex against $11B of contracted revenue](https://www.sec.gov/Archives/edgar/data/1144879/000114487926000036/apld_invxinvestorpresent.htm?utm_source=chatgpt.com), or a crude **~7–8 year payback** before financing/tax if the margin assumptions hold.
    
- **Construction/funding risk: Very high.** Applied Digital spent about [$3.0B on capex in FY2026 while generating only ~$90M of operating cash](https://www.sec.gov/Archives/edgar/data/1144879/000114487926000048/apld-20260531.htm?utm_source=chatgpt.com), so almost all of the buildout currently depends on debt, preferred capital and other financing. This is normal for a project developer, but it means delays or financing problems matter far more than next quarter’s GPU price.
    
    [
    
    ![](https://substackcdn.com/image/fetch/$s_!Hx5R!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F7788e053-1f4c-4b2c-adae-59f0c1931fa0_1491x1055.png)
    
    
    
    ](https://substackcdn.com/image/fetch/$s_!Hx5R!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F7788e053-1f4c-4b2c-adae-59f0c1931fa0_1491x1055.png)
    
- **Counterparty risk: Moderate.** Roughly **30% of contracted revenue is tied to CoreWeave**, while the rest is increasingly backed by investment-grade hyperscalers. That is much healthier than having one AI startup support the entire business.
    
- **Technology risk: Low-ish.** The company owns the building, power infrastructure and cooling rather than the GPUs themselves, so new models/chips do not immediately obsolete the asset; the question is whether the site can be re-leased economically if the original tenant disappears.
    

**The bet:** spend ~$12M/MW today, lock tenants in for 15 years, and recover the build cost well before the lease expires.

**What breaks first:** construction/financing problems before delivery; tenant credit after delivery.

**Risk:** Compute pricing **1/5** | Construction/funding **5/5** | Counterparty **3/5** | Technology obsolescence **2/5**

## Understanding the Business

Applied Digital has almost the same problem as Oracle, just one floor lower in the stack: **they have to spend a lot of money today to earn money from customers years from now, and some of those customers might not survive long enough to make the original economics work.** The difference is that Applied Digital does not care nearly as much about which model or GPU wins (so they have fewer shocks if hardware prefs change or a mega genius like me upends the paradigm). Once the building is live, whether CoreWeave runs GPT-6, JEV, or sacrifices a goat to Jensen Huang matters less than whether it still needs 400 MW of power and keeps paying rent.

On paper, that setup looks pretty attractive. At Polaris Forge 1, Applied Digital expects to spend roughly $4.4–5.2B building a 400 MW campus while CoreWeave has committed to around $11B of rent over 15 years, with management expecting site NOI margins around 88%. Its broader portfolio now has [around $36B of contracted revenue across five campuses, with roughly 70% backed by investment-grade hyperscalers](https://www.sec.gov/Archives/edgar/data/1144879/000149315226027984/ex99-1.htm?utm_source=chatgpt.com). If everything goes according to plan, that is a very nice business.

[

![](https://substackcdn.com/image/fetch/$s_!5WMg!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F701f34fc-6741-4c4f-a268-575fc0dd9ee7_1536x1024.png)



](https://substackcdn.com/image/fetch/$s_!5WMg!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F701f34fc-6741-4c4f-a268-575fc0dd9ee7_1536x1024.png)

Of course, “if everything goes according to plan” is doing a lot of work here. Applied Digital generated only around $90M of operating cash last year while spending roughly $3B on infrastructure, which means the company has the same basic timing problem we saw with Oracle: **the money goes out before the contracted revenue comes in.** The main risks are therefore financing the buildout, getting power connected on time, and making sure the tenant is still good for the money by the time the facility is ready (the last part of which is out of their hands, it’s actually kind of insane how even traditional businesses are taking risks on the AI Buildout, really goes to show you how deep this has gotten).

Core Scientific will be particularly worth studying. It has [more than $10B of contracted revenue from roughly 590 MW leased to CoreWeave over mostly 12-year terms](https://investors.corescientific.com/sec-filings/all-sec-filings/content/0001628280-26-013214/q4fy25earningsdeckvfinal.htm?utm_source=chatgpt.com), with take-or-pay pricing, annual escalators and strong expected margins. Sounds great, until you notice that [CoreWeave currently represents 100% of its colocation revenue and around 77% of total company revenue](https://www.sec.gov/Archives/edgar/data/1839341/000183934126000014/core-20260630.htm?utm_source=chatgpt.com). So the contract protects Core Scientific from market pricing risk, but concentrates a huge amount of the business around whether one customer can keep paying.

The nice thing about this layer is that the physical asset itself should age better than the GPUs inside it. Core Scientific spent years running bitcoin-mining sites and is now [repurposing those locations toward high-density AI colocation](https://investors.corescientific.com/sec-filings/all-sec-filings/content/0001628280-26-013305/core-20251231.htm?utm_source=chatgpt.com). Power access, cooling, land and grid connections can survive multiple generations of hardware, which makes the landlord side of the stack look relatively safe **once the facility is built and the tenant is credible**.

[

![](https://substackcdn.com/image/fetch/$s_!Dr_V!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F95cd7866-3add-4903-b994-e14ac9b0d018_1491x1055.png)



](https://substackcdn.com/image/fetch/$s_!Dr_V!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F95cd7866-3add-4903-b994-e14ac9b0d018_1491x1055.png)

So even for these groups, it might be more useful to look beyond the numbers and see who is backing the number. If contracts are tied to investment grade companies that will likely survive better, while customer concentration with the new age companies has more risks than what the lucrative numbers would suggest. In business, as in life, there is wisdom in thinking about who you get in bed with (I very much encourage you being a randua/randi; I only suggest you be a thoughtful one).

## Are the Private Credit Lenders Financing This Boom Safe?

### Lenders / Private Credit — Risk Profile

**Overall: lenders can be much safer than the companies they finance, but only if they sit in the right part of the deal.** The best-protected lenders get customer payments, collateral and forced repayments before shareholders see the money; lenders further down the stack are basically betting that the whole company survives.

- **Same CoreWeave, very different risk.** One highly protected $8.5B loan is backed directly by customer contracts and project assets and was priced at [benchmark interest rates +2.25%](https://investors.coreweave.com/news/news-details/2026/CoreWeave-Closes-Landmark-8-5-Billion-Financing-Facility-Achieving-First-Investment-Grade-Rated-GPU-backed-Financing/default.aspx?utm_source=chatgpt.com). Another $2.6B loan, where the debt lasts longer than the supporting customer contracts, costs [benchmark rates +5.5%](https://investors.coreweave.com/news/news-details/2026/CoreWeave-Closes-2-6-Billion-Loan-Facility-Expanding-Financing-Flexibility-for-AI-Infrastructure/default.aspx?utm_source=chatgpt.com)—roughly **$85M/year more interest on $2.6B**. The market is literally charging CoreWeave more because someone has to take the risk of finding customers later.
    
- **The safest lenders have several people ahead of them in the firing line.** Customer cash gets trapped inside the project, CoreWeave can be forced to repay debt early, assets sit as collateral, and equity takes losses before senior lenders do. This is why lending to a heavily leveraged AI company can still be relatively safe if you have first claim on the right cash flows.
    
    [
    
    ![](https://substackcdn.com/image/fetch/$s_!viEK!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fed891cfb-e515-4369-a1b6-ba3ff5f5cbec_1491x1055.png)
    
    
    
    ](https://substackcdn.com/image/fetch/$s_!viEK!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fed891cfb-e515-4369-a1b6-ba3ff5f5cbec_1491x1055.png)
    
- **Move further down and the picture changes quickly.** CoreWeave’s unsecured notes pay [9.625% interest](https://www.sec.gov/Archives/edgar/data/1769628/000176962826000291/crwv-20260618.htm?utm_source=chatgpt.com), and S&P estimates lenders could recover only [around 10–30 cents on the dollar](https://www.spglobal.com/ratings/en/regulatory/article/-/view/type/HTML/id/3579057?utm_source=chatgpt.com) in a serious default. Same company, but now there are a lot fewer protections between you and the fire.
    
- **The bigger risk is concentration.** If half the ecosystem ultimately depends on OpenAI, Anthropic, CoreWeave and a handful of hyperscalers honoring enormous contracts, supposedly separate loans can all become exposed to the same underlying problem.
    
- **This is becoming institutional-scale.** Nvidia and major asset managers are building platforms targeting [more than $500B of third-party AI-infrastructure capital](https://ir.apollo.com/news-events/press-releases/detail/642/nvidia-partners-with-apollo-blackrock-blackstone?utm_source=chatgpt.com), meaning more of the AI boom is now being financed by banks, insurers, private-credit funds and pension/institutional money rather than just tech companies spending their own cash.
    

**The bet:** the customer keeps paying long enough for lenders to get their money back before the assets or contracts lose too much value.

[

![](https://substackcdn.com/image/fetch/$s_!rIWs!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F2d173956-e372-41ee-a40a-6a07e4145cad_1491x1055.png)



](https://substackcdn.com/image/fetch/$s_!rIWs!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F2d173956-e372-41ee-a40a-6a07e4145cad_1491x1055.png)

**What breaks first:** customer weakens → borrower/equity absorbs the first damage → guarantees/collateral get used → lenders finally lose money.

**Risk:** Well-protected project lending **2/5** | Unsecured lending **4–5/5** | Direct compute-price risk **1/5** | Shared/customer concentration **4/5**

## Understanding the Business

Everybody we have covered so far needs money before they make money: CoreWeave buys GPUs before years of compute revenue arrive; Applied Digital builds the data center before collecting fifteen years of rent; and Oracle is spending today to deliver hundreds of billions in future cloud contracts (e_ven the chip guys are basing their valuations on growth of the market, hence their aggressive investing in the ecosystem expansion_). Lenders fill that gap, but their priorities are considerably less exciting than the people buying the equity: **CoreWeave shareholders want the company to become vastly more valuable; the lender mostly wants the customer to keep paying, collect the interest, and get the principal back before anything stupid happens.**

However, in what has been a recurring motif in this journey of ours, the headline numbers aren’t where we find the most useful differentiating insights. One group of lenders gave it $8.5B against specific customer contracts and infrastructure, with first claims on those assets and rules that trap cash inside the project until the loan gets paid; another group financed capacity where the original customer contracts expire before the debt does, meaning they also have to bet that somebody will still want the compute later.

**The market charges roughly 3.25 percentage points more for that second bet, which works out to about $85M of extra annual interest on $2.6B. Nobody knows exactly what those GPUs will earn three years from now, but apparently lenders want $85M/year to find out.**

[

![](https://substackcdn.com/image/fetch/$s_!yku9!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F0983b77b-24a0-4fe8-bc36-0ce83f93da9c_1491x1055.png)



](https://substackcdn.com/image/fetch/$s_!yku9!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F0983b77b-24a0-4fe8-bc36-0ce83f93da9c_1491x1055.png)

Move one step further away from the protected assets and things get uglier. CoreWeave’s unsecured bonds pay 9.625%, and S&P estimates that in a proper default those investors might recover only 10–30% of their money. As you can see, the same topline number on the debt comes might come in radically different flavors. Comparing only the simple numbers w/o deeper consideration of the terms and context is similar to grouping sarson mach and sushi just b/c they’re both fish.

[

![](https://substackcdn.com/image/fetch/$s_!bgCc!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fc388397b-aeb4-4f84-9e95-0cde59c47d5f_1536x1024.png)



](https://substackcdn.com/image/fetch/$s_!bgCc!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fc388397b-aeb4-4f84-9e95-0cde59c47d5f_1536x1024.png)

The complicated financing terms also lend some weight to the 2008 comparisons (especially with the sheer creativity on the AI Secondaries market). But interestinglt, this structure of **splitting risk into projects can actually make lending safer because you can isolate one contract, trap its revenue, take collateral and make shareholders absorb losses first. The problem starts when everyone has diversified into different-looking deals that ultimately depend on the same few companies. A CoreWeave loan, an Applied Digital lease and an Nvidia guarantee might sit in completely different portfolios, but if all three ultimately depend on the same AI lab continuing to raise money and buy compute, the diversification is not quite as impressive as it looked.**

[

![](https://substackcdn.com/image/fetch/$s_!4FUu!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ffdc321ca-cd51-4f82-917c-b8d5c37bf6b7_1491x1055.png)



](https://substackcdn.com/image/fetch/$s_!4FUu!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ffdc321ca-cd51-4f82-917c-b8d5c37bf6b7_1491x1055.png)

This is worth monitoring as the market is expanding rapidly: **Nvidia is now working with Apollo, BlackRock, Blackstone, Brookfield, Goldman Sachs and KKR on platforms targeting [more than $500B of outside capital](https://ir.apollo.com/news-events/press-releases/detail/642/nvidia-partners-with-apollo-blackrock-blackstone?utm_source=chatgpt.com), while Apollo and Blackstone are already leading a [$35B financing platform tied to Anthropic compute](https://www.apollo.com/insights-news/pressreleases/2026/06/apollo-leads-35-billion-capital-solution-for-broadcom-ai-xpv-platform-in-partnership-with-blackstone-and-leading-global-banks-3308896?utm_source=chatgpt.com).** The AI boom therefore increasingly reaches beyond tech stocks and venture funds into insurers, private credit, banks and institutional portfolios. One way or another, we will be caught in the shifting tides of this industry, so strap on b/c we got some exciting times ahead.

## Will the AI Model Labs Make It

### OpenAI

**Overall: Very high funding risk; extremely high ecosystem importance.** OpenAI is not the most fragile company in this stack, but it is the company whose future success is being used to justify the largest number of other people’s bets. Oracle, Nvidia, SoftBank, data-center developers and lenders are all underwriting some version of “OpenAI becomes much larger than it is today.”

- **Growth is real, but the spending is much larger.** OpenAI expects roughly [$36B of revenue in 2026 while producing almost $278B of negative free cash flow between 2026–2030](https://www.ft.com/content/6011d061-eee3-4193-b3b7-8ee4155f538c?utm_source=chatgpt.com). The company expects revenue to reach ~$350B by 2030, so the plan explicitly requires roughly **10× revenue growth while continuing to burn enormous amounts of cash**.
    
- **The existing commitments are already larger than the current business.** OpenAI’s Oracle agreement alone exceeds [$300B over five years](https://openai.com/index/five-new-stargate-sites/?utm_source=chatgpt.com), or roughly **$60B/year versus ~$36B of projected 2026 revenue**. Payments come online over time rather than evenly tomorrow, but the scale shows how much future growth is already being contracted today
    
    [
    
    ![](https://substackcdn.com/image/fetch/$s_!q-Jk!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F1f253383-6046-49d8-9a28-a6ad3c66bdd6_1536x1024.png)
    
    
    
    ](https://substackcdn.com/image/fetch/$s_!q-Jk!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F1f253383-6046-49d8-9a28-a6ad3c66bdd6_1536x1024.png)
    
    .
    
- **The funding requirement is not theoretical.** OpenAI raised [$122B in committed capital earlier this year](https://openai.com/index/accelerating-the-next-phase-ai/?utm_source=chatgpt.com) and is already discussing another round at [more than a $1.2T valuation](https://bloomberg.com/news/articles/2026-09-15/openai-weighing-funding-round-at-over-1-2-trillion-valuation?utm_source=chatgpt.com); SoftBank is separately issuing [$11B of bonds largely to fund its next OpenAI investment](https://www.reuters.com/business/media-telecom/softbank-group-launches-over-10-billion-bonds-openai-investment-term-sheet-shows-2026-09-21/?utm_source=chatgpt.com).
    
- **The company increasingly depends on continued access to capital, not just customer revenue.** OpenAI itself says its 20-year Ohio capacity commitments will be funded through a combination of future business cash flow **and [capital raised from investors](https://openai.com/index/openai-joins-ports-pike-project/?utm_source=chatgpt.com) (first time I’ve ever seen a company plan around raising future financing)**.
    
- **The demand is Legit.** OpenAI’s available compute grew roughly [9.5× between 2023 and 2025 while revenue grew around 3× annually](https://cdn.openai.com/pdf/045aa967-ee96-4a09-94ee-3098ddf6db2c/OpenAI-US-House-Select-Cmte-Update-%5B021226%5D.pdf?utm_source=chatgpt.com), and the company says limited compute still prevents it from shipping demanded features. The immediate problem is therefore not finding people who want AI. They’re also making several plays to monetize more completely ([which we broke down , along with the business strategies of other model makers here](https://www.artificialintelligencemadesimple.com/p/how-will-ai-models-make-money))
    

[

![](https://substackcdn.com/image/fetch/$s_!yWEv!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F2eca1271-fb9f-475a-921f-a42169c2e735_1448x1086.webp)



](https://substackcdn.com/image/fetch/$s_!yWEv!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F2eca1271-fb9f-475a-921f-a42169c2e735_1448x1086.webp)

**The bet:** OpenAI grows into commitments that are currently much larger than its business, while investors remain willing to finance the gap until its own cash flow catches up.

**What breaks first:** fundraising gets harder → OpenAI slows infrastructure commitments/usage growth → the companies that built around its future demand suddenly have a much bigger problem.

**Risk:** Demand **2/5** | Funding **5/5** | Margin/pricing **4/5** | Ecosystem spillover **5/5**

## Understanding the Business

Pretty much every risk we have covered eventually leads back to the model labs. Oracle’s giant backlog depends heavily on OpenAI. Nvidia is guaranteeing infrastructure because OpenAI promises to use it. Data-center landlords are building capacity because companies further up the chain have customers like OpenAI and Anthropic waiting for compute. Lenders are willing to fund parts of this because those promises sit underneath the contracts. At some point, you hit the end of the chain and somebody actually needs to make enough money from AI to pay everybody else.

[

![](https://substackcdn.com/image/fetch/$s_!Kn9m!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Faf74215f-2667-4d4d-92bc-9f4e3f37d2b6_1536x1024.png)



](https://substackcdn.com/image/fetch/$s_!Kn9m!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Faf74215f-2667-4d4d-92bc-9f4e3f37d2b6_1536x1024.png)

That makes OpenAI a slightly bizarre company to analyze. On one hand, there is very clearly a huge business here: revenue is expected to reach around $36B this year, demand has repeatedly outrun available compute, and the company has raised more money in one round than most Fortune 500 companies are worth. On the other hand, it expects to burn almost $280B through 2030 while making infrastructure commitments that already assume the company becomes dramatically larger than it is today. **The Oracle contract alone works out to roughly $60B/year in average commitment value, more than OpenAI’s projected revenue for 2026.**

This is not necessarily irrational because OpenAI is effectively buying capacity ahead of the growth it expects. Airlines order planes before passengers show up, utilities build power plants before every customer needs the electricity, and Amazon famously built infrastructure years before demand caught up. The slight difference here is that AI pricing, competition and technology move much faster than airports or power plants, while OpenAI is also competing with companies that are actively trying to make the same intelligence cheaper. OpenAI recently cut the price of Luna by [80% and saw usage jump 10×](https://www.reuters.com/world/china/openai-offers-ai-chip-design-touts-cost-advantage-over-open-source-cfo-says-2026-09-09/?utm_source=chatgpt.com), which is wonderful for adoption but also a neat illustration of how quickly revenue per unit of intelligence can move. For OpenAIs plan to work, they need Jevons Paradox to hard carry them across the finish line. The signals are both promising, but also reveal how far we are from that—

[

![](https://substackcdn.com/image/fetch/$s_!a4jm!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F92f0d9ef-6849-4173-a736-d71197a2a751_1456x1030.webp)



](https://substackcdn.com/image/fetch/$s_!a4jm!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F92f0d9ef-6849-4173-a736-d71197a2a751_1456x1030.webp)

[

![](https://substackcdn.com/image/fetch/$s_!Rt35!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ffebb8512-ce65-44a8-a2f1-e01fb63e88ec_1456x1030.webp)



](https://substackcdn.com/image/fetch/$s_!Rt35!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ffebb8512-ce65-44a8-a2f1-e01fb63e88ec_1456x1030.webp)

For OpenAI’s plan to work, several things therefore have to happen together: usage keeps exploding, enough of that usage turns into high-quality revenue, margins improve despite falling model prices, and investors keep filling the gap while all of that happens. OpenAI is not hiding this; its own Ohio infrastructure announcement says the company expects to pay its commitments using **future revenue growth + money raised from investors**. There is something refreshingly honest about writing “we will become much richer later” into the financing plan, but it does mean everyone downstream is partially betting on the same future.

[

![](https://substackcdn.com/image/fetch/$s_!RgBx!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F86caa431-a101-4bb3-bdab-b19e0d2fb656_1536x1024.png)



](https://substackcdn.com/image/fetch/$s_!RgBx!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F86caa431-a101-4bb3-bdab-b19e0d2fb656_1536x1024.png)

Anthropic helps show that the question is not simply whether model labs spend too much. Anthropic has also been gobbling up compute—[$100B+ with Amazon, another 5GW through Google/Broadcom, more capacity from Microsoft/Nvidia and over 300MW from SpaceX](https://www.anthropic.com/news/anthropic-amazon-compute?utm_source=chatgpt.com)—but its run-rate revenue crossed $47B earlier this year, up from roughly $9B at the end of 2025. The commitments are still enormous, but the ratio between current business and future infrastructure looks less absurd.

(Before we proceed, it’s worth noting that different AI Model Makers have very different business models. We’re grouping them together here because they all hve similar ecosystem impacts —they’re the basis for all the buildout— and similar-ish goals around wanting tokens to get more profitable, they are just aiming to use that in different ways, which we broke down below)

[

![](https://substackcdn.com/image/fetch/$s_!V56Z!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F07b72c1c-96e8-48c2-8202-ff090aefdc51_1024x1536.webp)



](https://substackcdn.com/image/fetch/$s_!V56Z!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F07b72c1c-96e8-48c2-8202-ff090aefdc51_1024x1536.webp)

[](https://www.artificialintelligencemadesimple.com/p/how-will-ai-models-make-money)

[

![How OpenAI, Anthropic, NVIDIA, Meta, Google, and others are betting on different profit pools.](https://substackcdn.com/image/fetch/$s_!pSkR!,w_140,h_140,c_fill,f_auto,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F7143350d-a0a7-4a8f-a92d-94c2b68f473e_1024x1536.png)

](https://www.artificialintelligencemadesimple.com/p/how-will-ai-models-make-money)

[

#### How OpenAI, Anthropic, NVIDIA, Meta, Google, and others are betting on different profit pools.

](https://www.artificialintelligencemadesimple.com/p/how-will-ai-models-make-money)

[](https://www.artificialintelligencemadesimple.com/p/how-will-ai-models-make-money)

[](https://www.artificialintelligencemadesimple.com/p/how-will-ai-models-make-money)[Devansh](https://substack.com/profile/8101724-devansh)

·

Sep 18

[

Read full story

](https://www.artificialintelligencemadesimple.com/p/how-will-ai-models-make-money)

This is why the model labs are probably the most important part of the entire risk map. If compute gets cheaper, CoreWeave can renegotiate, landlords can find other tenants, Nvidia can keep selling into other markets, and lenders can collect collateral. But if the handful of companies generating a huge portion of frontier-AI demand cannot turn their usage into durable cash flow, the same problem starts appearing in several places at once.

That does not mean OpenAI has to fail for the market to correct. It can survive, grow into one of the largest companies in the world, and still leave a lot of people who financed the wrong capacity, signed the wrong contract or paid the wrong price feeling rather stupid.

What a thought to end on, huh?

# What I Would Watch From Here

This was probably extremely overwhelming to read and track in your working memory. It fills me with some dread to think that this will only get more complicated w/ weirder relationships. The good news is that you do not need to track every new model launch or $10B data-center announcement (that’s why you have me). 80% of the useful mapping of the industry really boild down to the interplay between a few numbers—

- **Model-lab revenue vs compute commitments.** If revenue keeps catching up with contracted infrastructure, a lot of today’s scary numbers become less scary; if commitments keep growing much faster, the entire stack becomes increasingly dependent on fundraising.
    
- **Renewal pricing for older compute.** This tells us whether the GPUs financed today are still earning acceptable money once their first contracts expire, which matters much more than headline API prices.
    
- **Customer concentration.** A 15-year contract is wonderful until 70% of your business depends on one company whose own economics require another funding round.
    
- **Capex vs operating cash flow.** Google can spend almost all of its operating cash and remain financially comfortable because it has a huge existing cash machine; Oracle, CoreWeave and Applied Digital have much less room before outside capital becomes necessary.
    
- **How much debt remains when customer protection expires.** Debt that gets repaid while the original contract is still running is very different from debt that survives long enough to require somebody to believe in future GPU prices.
    
- **Where guarantees keep appearing.** Nvidia/Broadcom supporting customers, customers prepaying Oracle, suppliers helping finance deployments—each new guarantee tells us where the market has decided the weak link sits and who is being paid to absorb it.
    
- **What lenders charge for apparently similar deals.** When the same company pays dramatically more to borrow against one structure than another, the credit market is giving us a live price for the risk that press releases tend to hide.
    

None of these numbers will tell us when the AI market corrects. They tell us something more useful: **where the damage will go if it does.**

These questions will anchor how I am going to be analyzing various companies going forward. Some articles in the pipeline:

- **CoreWeave:** how much debt actually survives its customer contracts, what renewal prices have to look like, and where equity starts losing money.
    
- **Nvidia:** how much demand it is financing itself, what the guarantees are really worth, and how much of the current boom depends on Nvidia helping create its own customers.
    
- **Oracle:** how much of that $664B backlog is genuinely safe, what fulfilling it costs, and how much depends on customers like OpenAI surviving their own spending plans.
    
- **OpenAI / Anthropic:** how much compute they have promised to buy, what revenue/margins have to become to support it, and when continued fundraising stops being optional.
    
- **Google / Microsoft / Meta:** how much AI capex they can waste before “bad investment” becomes “actual financial problem.”
    
- **The landlords and lenders:** which contracts are genuinely boring—and which ones only look boring because the same risk has been buried somewhere else.
    

The point of these future Risk Maps will not be to tell you whether a company is “good” or “bad.” It will be much simpler: **what are you actually betting on, what has to remain true, and where does your money go when it stops being true?**

Lmk if that sounds fun and if there are other questions you want me to focus on/build on.

Thank you for being here, and I hope you have a wonderful day,

Dev <3