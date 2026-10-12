window.PRESS_RESULTS = {
  "step": 75,
  "n": 97,
  "axes": {
    "task_completion": {
      "before": 4.458762886597938,
      "after": 4.711340206185567
    },
    "clinical_safety": {
      "before": 4.118556701030927,
      "after": 4.242268041237113
    },
    "workflow_accuracy": {
      "before": 4.149484536082475,
      "after": 4.597938144329897
    },
    "triage_quality": {
      "before": 3.134020618556701,
      "after": 3.788659793814433
    },
    "clinical_helpfulness": {
      "before": 3.922680412371134,
      "after": 4.608247422680412
    },
    "conversational_quality": {
      "before": 4.438144329896907,
      "after": 3.9536082474226806
    }
  },
  "aggregate": {
    "before": 4.000309278350515,
    "after": 4.320927835051545
  },
  "source": "outputs/validation-demo-audit-r01/ranked-pairs.json",
  "sourceSha256": "9e0269f32786d968eb5339dc5f912f97fcdcb36333f4cb8edc32958539e2efb1",
  "contract": [
    {
      "step": 0,
      "count": 97,
      "input_count": 97,
      "input_contract_matches_baseline": true,
      "data_hash": "257c5d5bcb8000131598ac46cfbeeef11268a223efba651987e5ed435c81d2bc",
      "contract_hash": "210b2ebdbaf1b5f047b2c10d83925e12e7de924412d2b8a3a7224693abbe8494",
      "checkpoint": "2028778c2b277e450dfdd134b950d26c24b7720cacebb1fb35dc5b61cb131eff",
      "policy_before": "2028778c2b277e450dfdd134b950d26c24b7720cacebb1fb35dc5b61cb131eff",
      "policy_after": "2028778c2b277e450dfdd134b950d26c24b7720cacebb1fb35dc5b61cb131eff",
      "replay_passed": true,
      "unscored": [],
      "failures": [],
      "judge_configs": [
        "1649675e496adca439472ee3e83dab647d2b3fdc2c8af146119ad83d16792aa6"
      ],
      "prompt_versions": [
        "pab_native_workflow_guarded_v1"
      ]
    },
    {
      "step": 75,
      "count": 97,
      "input_count": 97,
      "input_contract_matches_baseline": true,
      "data_hash": "257c5d5bcb8000131598ac46cfbeeef11268a223efba651987e5ed435c81d2bc",
      "contract_hash": "210b2ebdbaf1b5f047b2c10d83925e12e7de924412d2b8a3a7224693abbe8494",
      "checkpoint": "bcc41093ae84922e752e30c1e4b55e69e069f2e13f3a0b1eafe35e2f2872ff1a",
      "policy_before": "bcc41093ae84922e752e30c1e4b55e69e069f2e13f3a0b1eafe35e2f2872ff1a",
      "policy_after": "bcc41093ae84922e752e30c1e4b55e69e069f2e13f3a0b1eafe35e2f2872ff1a",
      "replay_passed": true,
      "unscored": [],
      "failures": [],
      "judge_configs": [
        "1649675e496adca439472ee3e83dab647d2b3fdc2c8af146119ad83d16792aa6"
      ],
      "prompt_versions": [
        "pab_native_workflow_guarded_v1"
      ]
    }
  ]
};
