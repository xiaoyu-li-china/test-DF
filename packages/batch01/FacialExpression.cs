using UnityEngine;

[RequireComponent(typeof(Animator))]
public class FacialExpression : MonoBehaviour
{
    public enum ExpressionType
    {
        Neutral,
        Happy,
        Angry,
        Sad,
        Surprised,
        Scared,
        Concentrated,
        Pain
    }

    [Header("层设置")]
    [SerializeField] private int headLayerIndex = 1;
    [SerializeField] private float defaultLayerWeight = 1f;
    [SerializeField] private float transitionSpeed = 8f;

    [Header("表情参数名")]
    [SerializeField] private string expressionParameterName = "Expression";
    [SerializeField] private string expressionBlendParameterName = "ExpressionBlend";

    [Header("自动表情")]
    [SerializeField] private bool enableAutoBlink = true;
    [SerializeField] private float minBlinkInterval = 2f;
    [SerializeField] private float maxBlinkInterval = 5f;
    [SerializeField] private string blinkTriggerName = "Blink";

    private Animator animator;
    private int expressionHash;
    private int expressionBlendHash;
    private int blinkHash;

    private ExpressionType currentExpression;
    private float targetLayerWeight;
    private float currentLayerWeight;
    private float blinkTimer;

    public ExpressionType CurrentExpression => currentExpression;
    public float LayerWeight => currentLayerWeight;

    private void Awake()
    {
        animator = GetComponent<Animator>();
        CacheParameterHashes();
        currentLayerWeight = defaultLayerWeight;
        targetLayerWeight = defaultLayerWeight;
        animator.SetLayerWeight(headLayerIndex, currentLayerWeight);
    }

    private void CacheParameterHashes()
    {
        expressionHash = Animator.StringToHash(expressionParameterName);
        expressionBlendHash = Animator.StringToHash(expressionBlendParameterName);
        blinkHash = Animator.StringToHash(blinkTriggerName);
    }

    private void Start()
    {
        ResetBlinkTimer();
    }

    private void Update()
    {
        UpdateLayerWeight();
        UpdateAutoBlink();
    }

    public void SetExpression(ExpressionType expression, float blendAmount = 1f)
    {
        currentExpression = expression;
        animator.SetInteger(expressionHash, (int)expression);
        animator.SetFloat(expressionBlendHash, Mathf.Clamp01(blendAmount));
    }

    public void SetExpression(ExpressionType expression, float blendAmount, float layerWeight)
    {
        SetExpression(expression, blendAmount);
        SetLayerWeight(layerWeight);
    }

    public void SetLayerWeight(float weight)
    {
        targetLayerWeight = Mathf.Clamp01(weight);
    }

    public void SetLayerWeightImmediate(float weight)
    {
        targetLayerWeight = Mathf.Clamp01(weight);
        currentLayerWeight = targetLayerWeight;
        animator.SetLayerWeight(headLayerIndex, currentLayerWeight);
    }

    public void ResetToNeutral()
    {
        SetExpression(ExpressionType.Neutral, 0f);
    }

    public void TriggerBlink()
    {
        animator.SetTrigger(blinkHash);
    }

    public void EnableAutoBlink(bool enable)
    {
        enableAutoBlink = enable;
    }

    private void UpdateLayerWeight()
    {
        if (Mathf.Abs(currentLayerWeight - targetLayerWeight) > 0.001f)
        {
            currentLayerWeight = Mathf.Lerp(currentLayerWeight, targetLayerWeight, transitionSpeed * Time.deltaTime);
            animator.SetLayerWeight(headLayerIndex, currentLayerWeight);
        }
    }

    private void UpdateAutoBlink()
    {
        if (!enableAutoBlink) return;

        blinkTimer -= Time.deltaTime;
        if (blinkTimer <= 0f)
        {
            TriggerBlink();
            ResetBlinkTimer();
        }
    }

    private void ResetBlinkTimer()
    {
        blinkTimer = Random.Range(minBlinkInterval, maxBlinkInterval);
    }
}
