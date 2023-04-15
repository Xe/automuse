#import "template.typ": conf

#show: doc => conf(
  title: [
    Automuse: A System for Generating Pulp Novels
  ],
  authors: (
    (
      name: "Cadey A. Ratio",
      affiliation: "xn--g28h",
      email: "cadey@xeserv.us",
    ),
    (
      name: "Nicole Brennan",
      affiliation: "xn--g28h",
      email: "twi@xeserv.us",
    ),
    (
      name: "Jessica Williams",
      affiliation: "xn--g28h",
      email: "jess@xeserv.us",
    ),
    (
      name: "Ashley Kaplan",
      affiliation: "xn--g28h",
      email: "ashe@xeserv.us",
    ),
    (
      name: "Stephanie Williams",
      affiliation: "xn--g28h",
      email: "phi@xeserv.us",
    ),
    (
      name: "Ma Insa",
      affiliation: "xn--g28h",
      email: "mai@xeserv.us",
    ),
  ),
  abstract: [
    A novel approach to generating fiction novels using a combination of Plotto, a system of plot formulas, and GPT-4, a state-of-the-art language model is presented. An eBook publication pipeline that automates the process of creating and formatting eBooks from the generated text is also described. The aim is to explore the potential and limitations of using artificial intelligence for creative writing, as well as to provide a tool for amusement and experimentation.
  ],
  doc,
)

= Introduction

Modern advancements in large language models such as GPT-4#cite("openai2023gpt4") present many opportunities when used creatively. There have been a few attempts at doing this such as *Echoes of Atlantis*#cite("Coetzee2023GPT4") which used the ChatGPT#cite("chatgpt") web UI to synthesize prose to fill a novel, but none of these options were sufficiently automated for the author's tastes.

The goal of Automuse is to be able to fabricate these novels in minutes with little or no human intervention. As such, existing processes and published prior works were insufficient, requiring Automuse to be created.

Automuse is distributed as a GitHub repository at #link("https://github.com/Xe/automuse") for anyone to download or
attempt to use. Automuse wraps the following tools:

- Plottoriffic to generate the overall premise of a story and to name the main dramatis personae.
- The ChatGPT API to generate novel summary information, chapter summary information, and the prose of the novel.
- Stable Diffusion to generate cover art for publication.
- Pandoc to take generated prose and stitch it together into an eBook.

== Motivation

The authors discovered Plotto#cite("cook_1928"), a kind of algebra for generating the overall plot structure of pulp novels. This was written by William Cook, a man affectionately known as "the man who deforested Canada", who had an impressive publishing record at up to one entire novel written every week.

The authors wanted to find out if such a publishing pace could be met using the ChatGPT API. After experimentation and repair of plottoriffic#cite("Overton2016"), a Node.js package to implement Plotto's rule evaluation engine, Automuse was created.

== Results

According to the National November Writing Month rules#cite("NaNoWriMoRules"), the works of Automuse count as "novels". In testing, the program has been able to produce works of over 50,000 words (usually by a margin of 5-10 percent). The outputs of the program have been described as "hilarious", "partially nonsensical", and overall they have left readers wanting more somehow.

The authors of this paper consider this to be a success, though they note that future research is required to ascertain as to why readers have an affinity towards the AI generated content.

= Methodology

When writing novels, generally a human author starts by creating the premise of a novel, the major actors and their functions, the overall motivations, and the end result of the story. Plotto is a system that helps you do all of this by following a series of rules to pick a core conflict and then flesh things out with details. As an example, here is the core plot summary that Potto created for Network Stranded:

> Enterprise / Misfortune: Meeting with Misfortune and Being Cast Away in a Primitive, Isolated, and Savage Environment \
> \
> A Lawless Person \
> \
> Ismael takes a sea voyage in the hope of recovering aer health Ismael, taking a sea voyage, is shipwrecked and cast away on a desert island \
> \
> Ismael, of gentle birth and breeding, is isolated in a primitive, uninhabited wilderness, and compelled to battle with Nature for aer very existence \
> \
> Ismael, without food or water, is adrift in a small boat at sea \
> \
> Comes finally to the blank wall of enigma.

It's worth noting that Plotto is very much a product of its time. Plotto was written in the late 1920's and as such the information it generates is very dated and can sometimes generate things that are seen as problematic in modern sensibilities. Luckily, ChatGPT seems to sand away this roughness and is able to fabricate a better premise. All the pronouns are replaced with ae/aer because that is a decision that the creator of Plottoriffic made at some point.

== Summary Generation

From this description, ChatGPT is used to create a plot summary for the novel. These summaries look like this:

> After a disastrous turn of events, software engineer, Mia, finds herself stranded on a deserted island with no communication to the outside world. Mia uses her knowledge of peer to peer networks to create a makeshift communication system with other stranded individuals around the world, all connected by the same network. Together, they navigate survival and search for a way back to civilization while facing challenges posed by the island.

Normally GPT "hallucinations" (or when the model generates grammatically valid nonsense) are seen as an impediment or something to avoid. In this case, hallucinations are actually useful, as the summaries from Plotto are rarely enough information to fabricate believable stories. It was intended as an aid to the writing process, not a replacement for it.

In the same prompt, ChatGPT also creates a list of chapters for the novel with a high level summary of the events that happen in them. Here is the chapter list for Network Stranded:

- Disaster Strikes - Mia's company experiences a catastrophic network failure leading to her being stranded on an island.
- Stranded - Mia wakes up on a deserted island with limited supplies and no way to communicate.
- Building Connections - Mia develops a peer to peer network to connect with other people stranded around the world.
- Challenges of Survival - Mia and the other stranded individuals must navigate the hardships of surviving on the island.
- Exploration - Mia and a small group of stranded people head out to explore the island.
- Uncovering Secrets - During their exploration, Mia and the group discover hidden secrets about the island.
- Frayed Relationships - As resources begin to dwindle, tensions rise among the stranded survivors.
- Hopeful Discoveries - Mia receives a signal on her makeshift communication system, offering hope for rescue.
- Setbacks - Mia experiences a crushing setback in her plans for rescue.
- Moving Forward - Mia refuses to give up and formulates a new plan for rescue.
- Unexpected Allies - Mia and the other stranded survivors meet another group of people on the island who agree to help with their rescue.
- Facing Obstacles - Mia and the combined group must face obstacles and dangers as they try to implement their rescue plan.
- Breaking Through - After a grueling journey and setbacks, the survivors finally make a breakthrough in their rescue efforts.
- Homecoming - Mia and the other survivors return to civilization and adjust to life back in society.
- The Aftermath - Mia reflects on her experiences and the impact of the peer to peer network on their survival and rescue.

These chapter names and descriptions are fed into ChatGPT with the novel summary to create a list of scenes with major events in them. Here is the list of scenes for Chapter 1: "Disaster Strikes":

- Mia frantically tries to contact someone for help, but her phone and computer are dead. She decides to go outside to search for a signal, but realizes she's on a deserted island.
- As Mia tries to collect herself, she meets Ismael, who is also stranded on the island. They introduce themselves and discuss possible ways to survive.
- Mia remembers her knowledge about peer to peer networks and brainstorms a plan to create a makeshift communication system with other stranded individuals around the world, all connected by the same network.
- Mia and Ismael team up to scavenge for resources and build the communication system. They search for anything that could be used to amplify the signal, such as metal objects and wires.
- They encounter a danger while searching for materials: venomous snakes. Mia and Ismael must use their survival skills to avoid getting bitten.
- As the sun sets, Mia and Ismael finalize the communication system and connect with other stranded individuals on the network. They share their stories and discuss possible ways to get back home.

These scene descriptions are fed into ChatGPT to generate plausible prose to describe the novel. The main innovation of this part is that ChatGPT is few-shot primed to continue each scene after initial writing. If ChatGPT emitted a scene such as:

> As the helicopter landed, Ismael saw the first human beings he had seen in days. They jumped down from the helicopter, and looked at him with a mix of pity and relief. Ismael couldn't believe it – he was finally going home. \
> \
> As the helicopter took off, Ismael looked back at the deserted island, knowing that he had survived against all odds, but also knowing that he would never forget the terror and hopelessness that had left its mark on him forever.

The next prompt would be primed with the last paragraph, allowing ChatGPT to continue writing the story in a plausible manner. This does not maintain context or event contiunity, however the authors consider this to be a feature. When the authors have access to the variant of GPT-4 with an expanded context window, they plan to use this to generate more detailed scenes.

= Known Issues

Automuse is known to have a number of implementation problems that may hinder efforts to use it in a productive manner. These include, but are not limited to the following:

- Automuse uses GPT-3.5 to generate text. This has a number of problems and is overall unsuitable for making text that humans find aesthetically pleasing.
- Automuse uses Plotto as a source of plot generation. Plotto was created in 1928 and reflects many stereotypes of its time. Careful filtering of Plotto summaries is required to avoid repeating harmful cultural and social biases.
- Automuse does not maintain a context window for major events that occur during prose generation. This can create situations where events happen and then un-happen. This can be confusing for readers.

== Potential Industry Effects

According to Dan Olson's documentary about the predatory ghostwriting industry named Contrepreneurs: The Mikkensen Twins#cite("Olson2022"), the average pay rate for a ghostwriter for The Urban Writers can get as low as USD\$0.005 per word. Given that Automuse spends about USD\$0.20 to write about 50,000 words using GPT-3.5, this makes Automuse a significant cost reduction in the process for creating pulp novels, or about 1,250 times cheaper than hiring a human to perform the same job.

This would make Automuse an incredibly cost-effective solution for churning out novels at an industrial scale. With a total unit development cost of USD\$0.35 (including additional costs for cover design with Stable Diffusion, etc.), this could displace the lower end of the human-authored creative writing profession by a significant margin.

However, the quality of novels generated by Automuse is questionable at best. It falters and stubles with complicated contexts that haven't been written before. At one point in Network Stranded, the protagonist shares a secret to another character and that secret is never revealed to the reader.

It is worth noting that the conditions that writers for groups like The Urban Writers are absolutely miserable. If this technology manages to displace them, this may be a blessing in disguise. The conditions put upon writers to meet quotas and deadlines are unimaginably strict. This technology could act as a means of liberation for people forced to endure these harsh conditions, allowing them to pursue other ventures that may be better uses of their time and skills.

But, this would potentially funnel income away from them. In our capitalist society, income is required in order to afford basic necessities such as food, lodging, and clothing. This presents an ethical challenge that is beyond the scope of Automuse to fix.

If an Automuse novel manages to generate more than USD\$1 of income, this will represent a net profit. More sales means that there is more profit potential, as novel generation costs are fixed upon synthesis of the prose. This program is known to use a very small amount of resources, it is concievable that a system could be set up on a very cheap (USD\$50 or less) development board running a freely available Linux distribution and then automatically create novels on a weekly cadence for less than a total cost of USD\$5 per month.

= Conclusion

Automuse is a promising solution for people looking to experiment with the use of large language models such as GPT-3.5 or GPT-4 to generate fiction prose. Automuse's source code and selected outputs are made freely available to the public for inspection and inspiration of future downstream projects. The authors of this paper hope that Automuse is entertaining and encourage readers to engage with the novel #link("https://xena.greedo.xeserv.us/books/network-stranded.html")[Network Stranded] as an example of Automuse's capabilities. There is a promising future ahead.

#bibliography("citations.bib", style: "ieee")
