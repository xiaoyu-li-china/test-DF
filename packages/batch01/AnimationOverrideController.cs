using UnityEngine;
using System.Collections.Generic;

[RequireComponent(typeof(Animator))]
public class AnimationOverrideController : MonoBehaviour
{
    [System.Serializable]
    public class AnimationSet
    {
        public string setName;
        public AnimationClip idle;
        public AnimationClip walk;
        public AnimationClip run;
        public AnimationClip jump;
        public AnimationClip attack;
        public AnimationClip castSpell;
    }

    [SerializeField] private RuntimeAnimatorController baseController;
    [SerializeField] private List<AnimationSet> animationSets = new List<AnimationSet>();
    [SerializeField] private int defaultSetIndex = 0;

    private Animator animator;
    private AnimatorOverrideController overrideController;
    private AnimationSet currentSet;

    public int AnimationSetCount => animationSets.Count;
    public int CurrentSetIndex { get; private set; }

    private void Awake()
    {
        animator = GetComponent<Animator>();
        InitializeOverrideController();
    }

    private void Start()
    {
        if (animationSets.Count > 0)
        {
            ApplyAnimationSet(defaultSetIndex);
        }
    }

    private void InitializeOverrideController()
    {
        if (baseController == null)
        {
            baseController = animator.runtimeAnimatorController;
        }

        overrideController = new AnimatorOverrideController(baseController);
        animator.runtimeAnimatorController = overrideController;
    }

    public bool ApplyAnimationSet(int index)
    {
        if (index < 0 || index >= animationSets.Count)
        {
            Debug.LogError($"Invalid animation set index: {index}");
            return false;
        }

        currentSet = animationSets[index];
        CurrentSetIndex = index;

        if (currentSet.idle != null) overrideController["Idle"] = currentSet.idle;
        if (currentSet.walk != null) overrideController["Walk"] = currentSet.walk;
        if (currentSet.run != null) overrideController["Run"] = currentSet.run;
        if (currentSet.jump != null) overrideController["Jump"] = currentSet.jump;
        if (currentSet.attack != null) overrideController["Attack"] = currentSet.attack;
        if (currentSet.castSpell != null) overrideController["CastSpell"] = currentSet.castSpell;

        return true;
    }

    public bool ApplyAnimationSet(string setName)
    {
        int index = animationSets.FindIndex(s => s.setName == setName);
        if (index == -1)
        {
            Debug.LogError($"Animation set not found: {setName}");
            return false;
        }

        return ApplyAnimationSet(index);
    }

    public void NextAnimationSet()
    {
        if (animationSets.Count == 0) return;
        int nextIndex = (CurrentSetIndex + 1) % animationSets.Count;
        ApplyAnimationSet(nextIndex);
    }

    public void PreviousAnimationSet()
    {
        if (animationSets.Count == 0) return;
        int prevIndex = (CurrentSetIndex - 1 + animationSets.Count) % animationSets.Count;
        ApplyAnimationSet(prevIndex);
    }

    public AnimationSet GetAnimationSet(int index)
    {
        if (index < 0 || index >= animationSets.Count) return null;
        return animationSets[index];
    }

    public AnimationSet GetAnimationSet(string setName)
    {
        return animationSets.Find(s => s.setName == setName);
    }

    public void AddAnimationSet(AnimationSet set)
    {
        if (set == null) return;
        animationSets.Add(set);
    }

    public void OverrideClip(string originalClipName, AnimationClip newClip)
    {
        if (overrideController == null)
        {
            InitializeOverrideController();
        }

        overrideController[originalClipName] = newClip;
    }

    public AnimationClip GetOverrideClip(string originalClipName)
    {
        if (overrideController == null) return null;
        return overrideController[originalClipName];
    }

    public void ResetToBaseController()
    {
        if (baseController != null)
        {
            animator.runtimeAnimatorController = baseController;
        }
    }

    public void ReapplyOverrideController()
    {
        if (overrideController != null)
        {
            animator.runtimeAnimatorController = overrideController;
        }
    }
}
