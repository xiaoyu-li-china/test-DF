using UnityEngine;

public class PlayerAnimationTest : MonoBehaviour
{
    [Header("组件引用")]
    [SerializeField] private PlayerAnimator playerAnimator;
    [SerializeField] private AnimationOverrideController overrideController;
    [SerializeField] private FacialExpression facialExpression;

    [Header("测试按键")]
    [SerializeField] private KeyCode attackKey = KeyCode.Alpha1;
    [SerializeField] private KeyCode castSpellKey = KeyCode.Alpha2;
    [SerializeField] private KeyCode nextOutfitKey = KeyCode.Alpha3;
    [SerializeField] private KeyCode prevOutfitKey = KeyCode.Alpha4;
    [SerializeField] private KeyCode happyKey = KeyCode.Alpha5;
    [SerializeField] private KeyCode angryKey = KeyCode.Alpha6;
    [SerializeField] private KeyCode neutralKey = KeyCode.Alpha7;
    [SerializeField] private KeyCode blinkKey = KeyCode.Alpha8;

    private void Awake()
    {
        if (playerAnimator == null) playerAnimator = GetComponent<PlayerAnimator>();
        if (overrideController == null) overrideController = GetComponent<AnimationOverrideController>();
        if (facialExpression == null) facialExpression = GetComponent<FacialExpression>();
    }

    private void Start()
    {
        RegisterAnimationEvents();
    }

    private void RegisterAnimationEvents()
    {
        if (playerAnimator != null)
        {
            playerAnimator.OnAttackStarted += () => Debug.Log("攻击开始");
            playerAnimator.OnAttackEnded += () => Debug.Log("攻击结束");
            playerAnimator.OnCastSpellStarted += () => Debug.Log("施法开始");
            playerAnimator.OnCastSpellEnded += () => Debug.Log("施法结束");
        }
    }

    private void Update()
    {
        HandleSkillInput();
        HandleOutfitInput();
        HandleExpressionInput();
    }

    private void HandleSkillInput()
    {
        if (playerAnimator == null) return;

        if (Input.GetKeyDown(attackKey))
        {
            bool success = playerAnimator.PlayAttack();
            Debug.Log($"播放攻击动画: {(success ? "成功" : "失败")}");
        }

        if (Input.GetKeyDown(castSpellKey))
        {
            bool success = playerAnimator.PlayCastSpell();
            Debug.Log($"播放施法动画: {(success ? "成功" : "失败")}");
        }
    }

    private void HandleOutfitInput()
    {
        if (overrideController == null) return;

        if (Input.GetKeyDown(nextOutfitKey))
        {
            overrideController.NextAnimationSet();
            Debug.Log($"切换到下一个动画集: {overrideController.CurrentSetIndex}");
        }

        if (Input.GetKeyDown(prevOutfitKey))
        {
            overrideController.PreviousAnimationSet();
            Debug.Log($"切换到上一个动画集: {overrideController.CurrentSetIndex}");
        }
    }

    private void HandleExpressionInput()
    {
        if (facialExpression == null) return;

        if (Input.GetKeyDown(happyKey))
        {
            facialExpression.SetExpression(FacialExpression.ExpressionType.Happy, 1f);
            Debug.Log("切换表情: 开心");
        }

        if (Input.GetKeyDown(angryKey))
        {
            facialExpression.SetExpression(FacialExpression.ExpressionType.Angry, 1f);
            Debug.Log("切换表情: 愤怒");
        }

        if (Input.GetKeyDown(neutralKey))
        {
            facialExpression.ResetToNeutral();
            Debug.Log("切换表情: 中立");
        }

        if (Input.GetKeyDown(blinkKey))
        {
            facialExpression.TriggerBlink();
            Debug.Log("触发眨眼");
        }
    }

    public void PlayAttack()
    {
        playerAnimator?.PlayAttack();
    }

    public void PlayCastSpell()
    {
        playerAnimator?.PlayCastSpell();
    }

    public void ChangeOutfit(int index)
    {
        overrideController?.ApplyAnimationSet(index);
    }

    public void ChangeOutfit(string outfitName)
    {
        overrideController?.ApplyAnimationSet(outfitName);
    }

    public void SetExpression(FacialExpression.ExpressionType expression, float blend = 1f)
    {
        facialExpression?.SetExpression(expression, blend);
    }
}
