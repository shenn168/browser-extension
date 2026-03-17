const ML_DATA = [
  // ── CORE / CLASSICAL ──────────────────────────────────────────
  {
    id: "supervised",
    name: "Supervised Learning",
    category: "Core / Classical",
    definition:
      "Learns from labeled training data to map inputs to outputs. The algorithm is trained on input-output pairs and learns to predict the output for new inputs.",
    useCases: [
      "Email spam detection",
      "Medical diagnosis",
      "Image classification",
      "Credit scoring"
    ],
    examples: [
      "Linear Regression",
      "Decision Trees",
      "Support Vector Machines (SVM)",
      "Neural Networks"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Supervised_learning"
      },
      {
        label: "Google ML Crash Course",
        url: "https://developers.google.com/machine-learning/crash-course/supervised-learning"
      }
    ]
  },
  {
    id: "unsupervised",
    name: "Unsupervised Learning",
    category: "Core / Classical",
    definition:
      "Finds hidden patterns or structures in unlabeled data without explicit guidance. The model discovers the inherent structure of the data on its own.",
    useCases: [
      "Customer segmentation",
      "Anomaly detection",
      "Topic modeling",
      "Data compression"
    ],
    examples: [
      "K-Means Clustering",
      "DBSCAN",
      "Principal Component Analysis (PCA)",
      "Autoencoders"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Unsupervised_learning"
      }
    ]
  },
  {
    id: "semi-supervised",
    name: "Semi-Supervised Learning",
    category: "Core / Classical",
    definition:
      "Combines a small amount of labeled data with a large amount of unlabeled data during training. Bridges the gap between supervised and unsupervised learning.",
    useCases: [
      "Web content classification",
      "Speech analysis",
      "Medical image segmentation"
    ],
    examples: [
      "Label Propagation",
      "Self-Training",
      "Generative Adversarial Networks (GANs)"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Semi-supervised_learning"
      }
    ]
  },
  {
    id: "self-supervised",
    name: "Self-Supervised Learning",
    category: "Core / Classical",
    definition:
      "Generates its own supervisory signal from the input data by creating pretext tasks. Labels are automatically derived from the data itself.",
    useCases: [
      "Natural Language Processing pretraining",
      "Image representation learning",
      "Video understanding"
    ],
    examples: ["BERT", "GPT", "SimCLR", "BYOL"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Self-supervised_learning"
      }
    ]
  },
  {
    id: "reinforcement",
    name: "Reinforcement Learning",
    category: "Core / Classical",
    definition:
      "An agent learns to make decisions by interacting with an environment, receiving rewards or penalties based on its actions to maximize cumulative reward.",
    useCases: [
      "Game playing (Chess, Go)",
      "Robotics",
      "Autonomous vehicles",
      "Recommendation systems"
    ],
    examples: ["Q-Learning", "Deep Q-Network (DQN)", "PPO", "AlphaGo"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Reinforcement_learning"
      }
    ]
  },

  // ── LEARNING PARADIGMS / REASONING ───────────────────────────
  {
    id: "inductive",
    name: "Inductive Learning",
    category: "Paradigms / Reasoning",
    definition:
      "Generalizes from specific training examples to broader rules or models applicable to unseen data. The classic form of machine learning.",
    useCases: [
      "Rule extraction from datasets",
      "Classification systems",
      "Expert systems"
    ],
    examples: ["Decision Tree induction", "ILP (Inductive Logic Programming)"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Inductive_reasoning"
      }
    ]
  },
  {
    id: "deductive",
    name: "Deductive Learning",
    category: "Paradigms / Reasoning",
    definition:
      "Applies known general rules and logic to derive specific conclusions. Uses prior knowledge to constrain or guide the learning process.",
    useCases: [
      "Automated theorem proving",
      "Logic-based AI",
      "Knowledge base reasoning"
    ],
    examples: ["Explanation-Based Learning (EBL)", "Logic programming"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Deductive_reasoning"
      }
    ]
  },
  {
    id: "transductive",
    name: "Transductive Learning",
    category: "Paradigms / Reasoning",
    definition:
      "Makes predictions directly for specific test instances observed during training, without generalizing to unseen data beyond those instances.",
    useCases: [
      "Graph-based classification",
      "Semi-supervised node classification",
      "Small dataset scenarios"
    ],
    examples: [
      "Transductive SVM",
      "Label Propagation on graphs",
      "k-NN (in transductive mode)"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Transduction_(machine_learning)"
      }
    ]
  },
  {
    id: "abductive",
    name: "Abductive Learning",
    category: "Paradigms / Reasoning",
    definition:
      "Infers the most likely explanation or hypothesis from incomplete or ambiguous observations, often combining neural perception with logical reasoning.",
    useCases: [
      "Medical diagnosis",
      "Fault detection",
      "Scientific hypothesis generation"
    ],
    examples: ["ABL (Abductive Learning) framework", "Neuro-symbolic systems"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Abductive_reasoning"
      }
    ]
  },
  {
    id: "statistical-inference",
    name: "Statistical Inference-Based Learning",
    category: "Paradigms / Reasoning",
    definition:
      "Uses statistical methods and probabilistic models to draw conclusions from data, quantifying uncertainty and making inference about populations from samples.",
    useCases: [
      "A/B testing analysis",
      "Clinical trials",
      "Survey analysis",
      "Econometrics"
    ],
    examples: [
      "Maximum Likelihood Estimation (MLE)",
      "Bayesian Inference",
      "Hypothesis Testing"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Statistical_inference"
      }
    ]
  },

  // ── INSTANCE & LABEL VARIATIONS ──────────────────────────────
  {
    id: "multi-instance",
    name: "Multi-Instance Learning",
    category: "Instance & Label Variations",
    definition:
      "The learner receives bags of instances where only bag-level labels are known. A bag is positive if at least one instance in it is positive.",
    useCases: ["Drug activity prediction", "Image classification", "Text categorization"],
    examples: ["MI-SVM", "MILES", "DD (Diverse Density)"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Multiple-instance_learning"
      }
    ]
  },
  {
    id: "multi-label",
    name: "Multi-Label Learning",
    category: "Instance & Label Variations",
    definition:
      "Each instance can simultaneously belong to multiple classes. Unlike multi-class learning, labels are not mutually exclusive.",
    useCases: [
      "News article tagging",
      "Music genre classification",
      "Medical coding",
      "Image scene recognition"
    ],
    examples: ["Binary Relevance", "Classifier Chains", "Label Powerset"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Multi-label_classification"
      }
    ]
  },
  {
    id: "one-shot",
    name: "One-Shot Learning",
    category: "Instance & Label Variations",
    definition:
      "Enables a model to learn and recognize new classes from only one (or very few) training examples by leveraging prior knowledge.",
    useCases: ["Face recognition", "Signature verification", "Medical imaging"],
    examples: ["Siamese Networks", "Matching Networks", "Prototypical Networks"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/One-shot_learning"
      }
    ]
  },
  {
    id: "few-shot",
    name: "Few-Shot Learning",
    category: "Instance & Label Variations",
    definition:
      "Trains a model to generalize from a very small number of labeled examples per class using meta-learning or prior knowledge transfer.",
    useCases: [
      "Rare disease detection",
      "Low-resource language processing",
      "Robotics task adaptation"
    ],
    examples: ["MAML", "Prototypical Networks", "GPT few-shot prompting"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Few-shot_learning_(natural_language_processing)"
      }
    ]
  },
  {
    id: "zero-shot",
    name: "Zero-Shot Learning",
    category: "Instance & Label Variations",
    definition:
      "Makes predictions for classes that were never seen during training by leveraging semantic descriptions or attribute embeddings.",
    useCases: [
      "Image classification of unseen categories",
      "NLP intent detection",
      "Cross-lingual transfer"
    ],
    examples: ["CLIP", "GPT-3 zero-shot", "Attribute-based classifiers"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Zero-shot_learning"
      }
    ]
  },

  // ── TRANSFER & ADAPTATION ─────────────────────────────────────
  {
    id: "transfer-learning",
    name: "Transfer Learning",
    category: "Transfer & Adaptation",
    definition:
      "Leverages knowledge gained from training on one task or domain and applies it to a different but related task or domain.",
    useCases: [
      "Image classification with pretrained CNNs",
      "NLP fine-tuning",
      "Medical imaging with limited data"
    ],
    examples: ["ResNet fine-tuning", "BERT fine-tuning", "VGG transfer"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Transfer_learning"
      }
    ]
  },
  {
    id: "domain-adaptation",
    name: "Domain Adaptation",
    category: "Transfer & Adaptation",
    definition:
      "Adapts a model trained on a source domain distribution to perform well on a different but related target domain distribution.",
    useCases: [
      "Sentiment analysis across languages",
      "Sim-to-real robotics transfer",
      "Document adaptation"
    ],
    examples: ["DANN (Domain-Adversarial Neural Network)", "CORAL", "AdaBN"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Domain_adaptation"
      }
    ]
  },
  {
    id: "meta-learning",
    name: "Meta-Learning",
    category: "Transfer & Adaptation",
    definition:
      "Trains models to quickly adapt to new tasks with minimal data by learning 'how to learn' across many related tasks.",
    useCases: [
      "Rapid personalization",
      "Robotics skill acquisition",
      "Few-shot classification"
    ],
    examples: ["MAML", "Reptile", "Prototypical Networks"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Meta-learning_(computer_science)"
      }
    ]
  },
  {
    id: "continual-learning",
    name: "Continual Learning",
    category: "Transfer & Adaptation",
    definition:
      "Enables models to learn sequentially from new tasks or data streams without catastrophically forgetting previously learned knowledge.",
    useCases: [
      "Incremental object recognition",
      "Adaptive NLP systems",
      "Lifelong autonomous agents"
    ],
    examples: ["EWC (Elastic Weight Consolidation)", "Progressive Neural Networks", "iCaRL"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Continual_learning"
      }
    ]
  },
  {
    id: "multi-task",
    name: "Multi-Task Learning",
    category: "Transfer & Adaptation",
    definition:
      "Simultaneously trains a model on multiple related tasks so that knowledge from each task can benefit the others, improving overall performance.",
    useCases: [
      "NLP (translation + parsing + NER together)",
      "Autonomous driving",
      "Healthcare prediction"
    ],
    examples: ["Hard parameter sharing networks", "Soft parameter sharing", "MT-DNN"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Multi-task_learning"
      }
    ]
  },
  {
    id: "cross-modal",
    name: "Cross-Modal Learning",
    category: "Transfer & Adaptation",
    definition:
      "Transfers and aligns knowledge across different data modalities such as text, images, audio, and video.",
    useCases: [
      "Image captioning",
      "Visual question answering",
      "Audio-visual speech recognition"
    ],
    examples: ["CLIP", "DALL-E", "AudioCLIP"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Multimodal_learning"
      }
    ]
  },

  // ── DATA EFFICIENCY & ACTIVE STRATEGIES ───────────────────────
  {
    id: "active-learning",
    name: "Active Learning",
    category: "Data Efficiency & Active Strategies",
    definition:
      "The model interactively queries a human oracle or some information source to label the most informative or uncertain data points, minimizing labeling cost.",
    useCases: [
      "Medical annotation",
      "Legal document review",
      "Rare event detection"
    ],
    examples: [
      "Uncertainty Sampling",
      "Query by Committee",
      "Expected Model Change"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Active_learning_(machine_learning)"
      }
    ]
  },
  {
    id: "online-learning",
    name: "Online Learning",
    category: "Data Efficiency & Active Strategies",
    definition:
      "Updates the model incrementally as each new data point or mini-batch arrives, rather than retraining on the full dataset.",
    useCases: [
      "Stock price prediction",
      "Real-time spam filtering",
      "Dynamic recommendation systems"
    ],
    examples: ["Perceptron", "Online Gradient Descent", "River (Python library)"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Online_machine_learning"
      }
    ]
  },
  {
    id: "curriculum-learning",
    name: "Curriculum Learning",
    category: "Data Efficiency & Active Strategies",
    definition:
      "Trains models by presenting examples in a meaningful order, typically from easy to hard, mimicking human learning strategies.",
    useCases: [
      "Neural machine translation",
      "Visual recognition training",
      "Reinforcement learning warm-up"
    ],
    examples: ["Self-paced Learning", "Competence-based Curriculum", "SPL (Self-Paced Learning)"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Curriculum_learning"
      }
    ]
  },
  {
    id: "weak-supervision",
    name: "Weak Supervision",
    category: "Data Efficiency & Active Strategies",
    definition:
      "Trains models using noisy, imprecise, limited, or programmatically generated labels instead of expensive hand-labeled ground truth.",
    useCases: [
      "Medical record labeling",
      "Large-scale NLP datasets",
      "Industrial inspection"
    ],
    examples: ["Snorkel framework", "Data programming", "Distant supervision"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Weak_supervision"
      }
    ]
  },
  {
    id: "batch-learning",
    name: "Batch Learning",
    category: "Data Efficiency & Active Strategies",
    definition:
      "Trains the model using the entire dataset at once in an offline fashion before deployment. The model does not update once deployed.",
    useCases: [
      "Traditional ML pipelines",
      "Static classification tasks",
      "Offline recommendation models"
    ],
    examples: ["Standard training loops", "Scikit-learn pipeline batch training"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Batch_learning"
      }
    ]
  },

  // ── GENERATIVE & PROBABILISTIC ────────────────────────────────
  {
    id: "generative",
    name: "Generative Learning",
    category: "Generative & Probabilistic",
    definition:
      "Models the joint probability distribution P(X, Y) to generate new data samples and understand the underlying data distribution.",
    useCases: [
      "Image synthesis",
      "Text generation",
      "Data augmentation",
      "Drug molecule generation"
    ],
    examples: [
      "Generative Adversarial Networks (GANs)",
      "Variational Autoencoders (VAEs)",
      "Diffusion Models"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Generative_model"
      }
    ]
  },
  {
    id: "discriminative",
    name: "Discriminative Learning",
    category: "Generative & Probabilistic",
    definition:
      "Directly models the decision boundary or conditional probability P(Y|X) between classes, without modeling the data distribution.",
    useCases: [
      "Text classification",
      "Object detection",
      "Sentiment analysis"
    ],
    examples: ["Logistic Regression", "SVM", "CRF (Conditional Random Fields)"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Discriminative_model"
      }
    ]
  },
  {
    id: "bayesian",
    name: "Bayesian Learning",
    category: "Generative & Probabilistic",
    definition:
      "Incorporates prior beliefs about parameters and updates them using observed data via Bayes' theorem to produce posterior distributions.",
    useCases: [
      "Spam filtering",
      "Medical diagnosis under uncertainty",
      "Hyperparameter optimization"
    ],
    examples: ["Naive Bayes", "Bayesian Neural Networks", "Gaussian Processes"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Bayesian_inference"
      }
    ]
  },
  {
    id: "probabilistic-graphical",
    name: "Probabilistic Graphical Models",
    category: "Generative & Probabilistic",
    definition:
      "Represents complex joint distributions using graph structures where nodes are variables and edges encode conditional dependencies.",
    useCases: [
      "Speech recognition",
      "Bioinformatics",
      "Social network analysis",
      "Disease diagnosis"
    ],
    examples: [
      "Bayesian Networks",
      "Markov Random Fields",
      "Hidden Markov Models (HMMs)"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Graphical_model"
      }
    ]
  },
  {
    id: "density-estimation",
    name: "Density Estimation",
    category: "Generative & Probabilistic",
    definition:
      "Learns the underlying probability density function of the data to understand its distribution and generate or evaluate new samples.",
    useCases: [
      "Anomaly detection",
      "Generative modeling",
      "Data imputation"
    ],
    examples: [
      "Kernel Density Estimation (KDE)",
      "Normalizing Flows",
      "Gaussian Mixture Models (GMM)"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Density_estimation"
      }
    ]
  },

  // ── ENSEMBLE & STRUCTURAL ─────────────────────────────────────
  {
    id: "ensemble",
    name: "Ensemble Learning",
    category: "Ensemble & Structural",
    definition:
      "Combines predictions from multiple individual models to produce a stronger, more robust and accurate model than any single learner.",
    useCases: [
      "Kaggle competition winning solutions",
      "Fraud detection",
      "Medical diagnosis"
    ],
    examples: ["Random Forest", "XGBoost", "AdaBoost", "Stacking"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Ensemble_learning"
      }
    ]
  },
  {
    id: "federated",
    name: "Federated Learning",
    category: "Ensemble & Structural",
    definition:
      "Trains machine learning models across multiple decentralized devices or servers holding local data without exchanging raw data, preserving privacy.",
    useCases: [
      "Mobile keyboard prediction",
      "Healthcare data collaboration",
      "IoT device learning"
    ],
    examples: ["FedAvg", "Google's Gboard", "PySyft"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Federated_learning"
      }
    ]
  },
  {
    id: "hierarchical",
    name: "Hierarchical Learning",
    category: "Ensemble & Structural",
    definition:
      "Organizes learning in multiple levels of abstraction where higher layers learn more complex representations built upon lower-level features.",
    useCases: [
      "Deep learning feature hierarchies",
      "Hierarchical classification",
      "Knowledge graph construction"
    ],
    examples: ["Deep CNNs", "Hierarchical Clustering", "H-DNN"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Hierarchical_learning"
      }
    ]
  },

  // ── EMERGING & SPECIALIZED ────────────────────────────────────
  {
    id: "contrastive",
    name: "Contrastive Learning",
    category: "Emerging & Specialized",
    definition:
      "Learns representations by comparing similar (positive) and dissimilar (negative) data pairs, pulling similar pairs closer and pushing dissimilar ones apart.",
    useCases: [
      "Image representation learning",
      "Sentence embeddings",
      "Medical image analysis"
    ],
    examples: ["SimCLR", "MoCo", "SupCon", "CLIP"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Contrastive_learning"
      }
    ]
  },
  {
    id: "causal",
    name: "Causal Learning",
    category: "Emerging & Specialized",
    definition:
      "Goes beyond correlations to identify and model cause-and-effect relationships in data, enabling better generalization and intervention reasoning.",
    useCases: [
      "Healthcare treatment effect estimation",
      "Policy-making",
      "Robust AI systems"
    ],
    examples: [
      "Structural Causal Models (SCM)",
      "DoWhy library",
      "Causal Forests"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Causal_inference"
      }
    ]
  },
  {
    id: "neuro-symbolic",
    name: "Neuro-Symbolic Learning",
    category: "Emerging & Specialized",
    definition:
      "Integrates neural network learning with symbolic AI reasoning to combine the pattern recognition strength of deep learning with logic-based reasoning.",
    useCases: [
      "Knowledge base completion",
      "Explainable AI",
      "Program synthesis"
    ],
    examples: ["Neural Theorem Provers", "DeepProbLog", "AlphaGeometry"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Neuro-symbolic_AI"
      }
    ]
  },
  {
    id: "graph-based",
    name: "Graph-Based Learning",
    category: "Emerging & Specialized",
    definition:
      "Operates on graph-structured data, learning from nodes, edges, and their relationships using specialized neural architectures.",
    useCases: [
      "Social network analysis",
      "Molecular property prediction",
      "Recommendation systems",
      "Knowledge graph reasoning"
    ],
    examples: [
      "Graph Convolutional Networks (GCN)",
      "GraphSAGE",
      "GAT (Graph Attention Network)"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Graph_neural_network"
      }
    ]
  },
  {
    id: "imitation",
    name: "Imitation Learning",
    category: "Emerging & Specialized",
    definition:
      "Learns a policy by observing and mimicking the behavior of an expert demonstrator rather than learning from explicit reward signals.",
    useCases: [
      "Autonomous driving",
      "Robotic manipulation",
      "Game playing agents"
    ],
    examples: [
      "Behavioral Cloning",
      "GAIL (Generative Adversarial Imitation Learning)",
      "DAgger"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Imitation_learning"
      }
    ]
  },
  {
    id: "inverse-rl",
    name: "Inverse Reinforcement Learning",
    category: "Emerging & Specialized",
    definition:
      "Infers the underlying reward function of an agent by observing its behavior, essentially learning what objective the agent is trying to optimize.",
    useCases: [
      "Autonomous driving reward modeling",
      "Robot learning from demonstration",
      "Human preference modeling"
    ],
    examples: ["MaxEnt IRL", "Bayesian IRL", "GAIL"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Inverse_reinforcement_learning"
      }
    ]
  },
  {
    id: "multi-agent",
    name: "Multi-Agent Learning",
    category: "Emerging & Specialized",
    definition:
      "Multiple agents learn simultaneously in a shared environment, either cooperating, competing, or doing both to achieve individual or collective goals.",
    useCases: [
      "Multi-player game AI",
      "Traffic flow optimization",
      "Swarm robotics",
      "Financial market simulation"
    ],
    examples: ["MADDPG", "QMix", "OpenAI Five"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Multi-agent_reinforcement_learning"
      }
    ]
  },
  {
    id: "adversarial",
    name: "Adversarial Learning",
    category: "Emerging & Specialized",
    definition:
      "Trains models using adversarial examples or adversarial objectives to improve robustness, generalization, or to generate realistic synthetic data.",
    useCases: [
      "Image generation (GANs)",
      "Robust model training",
      "Security and attack defense"
    ],
    examples: [
      "Generative Adversarial Networks (GANs)",
      "Adversarial Training (PGD)",
      "FGSM"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Adversarial_machine_learning"
      }
    ]
  },
  {
    id: "evolutionary",
    name: "Evolutionary / Genetic Learning",
    category: "Emerging & Specialized",
    definition:
      "Uses principles of biological evolution — selection, mutation, and crossover — to optimize model parameters, architectures, or policies.",
    useCases: [
      "Neural architecture search",
      "Hyperparameter optimization",
      "Robotics controller design"
    ],
    examples: [
      "Genetic Algorithms (GA)",
      "Neuroevolution (NEAT)",
      "Evolution Strategies (ES)"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Evolutionary_computation"
      }
    ]
  },
  {
    id: "quantum-ml",
    name: "Quantum Machine Learning",
    category: "Emerging & Specialized",
    definition:
      "Applies quantum computing principles such as superposition and entanglement to machine learning algorithms to achieve potential speedups.",
    useCases: [
      "Optimization problems",
      "Drug discovery",
      "Cryptography",
      "High-dimensional data processing"
    ],
    examples: [
      "Quantum SVM",
      "Variational Quantum Eigensolver (VQE)",
      "PennyLane"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Quantum_machine_learning"
      }
    ]
  },
  {
    id: "xai",
    name: "Explainable / Interpretable ML (XAI)",
    category: "Emerging & Specialized",
    definition:
      "Focuses on making the decisions and predictions of machine learning models transparent, understandable, and interpretable to humans.",
    useCases: [
      "Healthcare AI compliance",
      "Financial credit decisions",
      "Legal AI",
      "Regulatory compliance"
    ],
    examples: ["SHAP", "LIME", "Integrated Gradients", "Attention Visualization"],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Explainable_artificial_intelligence"
      }
    ]
  },
  {
    id: "neuromorphic",
    name: "Neuromorphic Learning",
    category: "Emerging & Specialized",
    definition:
      "Models computation and learning after the structure and function of biological neural systems, using spiking neural networks and event-driven processing.",
    useCases: [
      "Low-power edge AI",
      "Sensory processing",
      "Brain-inspired computing"
    ],
    examples: [
      "Spiking Neural Networks (SNNs)",
      "Intel Loihi chip",
      "IBM TrueNorth"
    ],
    links: [
      {
        label: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Neuromorphic_computing"
      }
    ]
  }
];

// Get all unique categories
const CATEGORIES = [...new Set(ML_DATA.map(item => item.category))];