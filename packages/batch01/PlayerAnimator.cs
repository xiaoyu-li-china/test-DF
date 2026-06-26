using UnityEngine;
using System;

[RequireComponent(typeof(Animator))]
public class PlayerAnimator : MonoBehaviour
{
    [Header("速度阈值")]
    [SerializeField] private float walkThreshold = 0.1f;
    [SerializeField] private float runThreshold = 4.5f;

    [Header("技能设置")]
    [SerializeField] private string attackStateName = "Attack";
    [SerializeField] private string castSpellStateName = "CastSpell";
    [SerializeField] private int baseLayerIndex = 0;

    private Animator animator;
    private int speedHash;
    private int isGroundedHash;
    private int jumpHash;
    private int landHash;
    private int attackHash;
    private int castSpellHash;
    private int isUsingSkillHash;

    private bool isUsingSkill;

    public bool IsUsingSkill => isUsingSkill;

    public event Action OnAttackStarted;
    public event Action OnAttackEnded;
    public event Action OnCastSpellStarted;
    public event Action OnCastSpellEnded;

    private void Awake()
    {
        animator = GetComponent<Animator>();
        CacheParameterHashes();
    }

    private void CacheParameterHashes()
    {
        speedHash = Animator.StringToHash("Speed");
        isGroundedHash = Animator.StringToHash("IsGrounded");
        jumpHash = Animator.StringToHash("Jump");
        landHash = Animator.StringToHash("Land");
        attackHash = Animator.StringToHash("Attack");
        castSpellHash = Animator.StringToHash("CastSpell");
        isUsingSkillHash = Animator.StringToHash("IsUsingSkill");
    }

    public void UpdateSpeed(float currentSpeed)
    {
        if (!isUsingSkill)
        {
            animator.SetFloat(speedHash, currentSpeed);
        }
    }

    public void UpdateGrounded(bool grounded)
    {
        animator.SetBool(isGroundedHash, grounded);
    }

    public void OnJump()
    {
        if (!isUsingSkill)
        {
            animator.SetTrigger(jumpHash);
        }
    }

    public void OnLanded()
    {
        animator.SetTrigger(landHash);
    }

    public bool PlayAttack()
    {
        if (isUsingSkill || !IsReadyForSkill()) return false;

        animator.SetTrigger(attackHash);
        animator.SetBool(isUsingSkillHash, true);
        isUsingSkill = true;
        OnAttackStarted?.Invoke();
        return true;
    }

    public bool PlayCastSpell()
    {
        if (isUsingSkill || !IsReadyForSkill()) return false;

        animator.SetTrigger(castSpellHash);
        animator.SetBool(isUsingSkillHash, true);
        isUsingSkill = true;
        OnCastSpellStarted?.Invoke();
        return true;
    }

    private bool IsReadyForSkill()
    {
        AnimatorStateInfo stateInfo = animator.GetCurrentAnimatorStateInfo(baseLayerIndex);
        return !stateInfo.IsName(attackStateName) && !stateInfo.IsName(castSpellStateName);
    }

    public void OnAttackAnimationEnd()
    {
        if (isUsingSkill)
        {
            isUsingSkill = false;
            animator.SetBool(isUsingSkillHash, false);
            OnAttackEnded?.Invoke();
        }
    }

    public void OnCastSpellAnimationEnd()
    {
        if (isUsingSkill)
        {
            isUsingSkill = false;
            animator.SetBool(isUsingSkillHash, false);
            OnCastSpellEnded?.Invoke();
        }
    }

    public void SetLayerWeight(int layerIndex, float weight)
    {
        animator.SetLayerWeight(layerIndex, weight);
    }

    public float GetLayerWeight(int layerIndex)
    {
        return animator.GetLayerWeight(layerIndex);
    }
}
