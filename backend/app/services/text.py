"""Small text utilities shared by the offline summarizer and AskFred retrieval."""

import re

STOPWORDS = frozenset(
    """a about above after again against all also am an and any are as at be because been
    before being below between both but by can could did do does doing done down during each
    else even ever every few for from further get gets getting go going gonna got had has
    have having he her here hers him his how i if in into is it its itself just know let
    like ll look make maybe me might more most much must my need no nor not now of off ok
    okay on once one only or other our ours out over own pretty probably quite re really
    right said same say see she should so some something sounds still such sure take than
    thank thanks that the their them then there these they thing things think this those
    though through to too um uh under until up us ve very want was way we well were what
    when where which while who whom why will with would yeah yes yet you your yours great
    good actually basically lot kind week weeks today tomorrow time folks guys everyone hey
    hi first second third two three four five six seven eight nine ten twenty thirty forty
    fifty hundred thousand next last many""".split()
)

# Words of 4+ letters, skipping contractions/possessives ("we'll", "Daniel's").
WORD_RE = re.compile(r"\b[A-Za-z][A-Za-z\-]{3,}\b(?!')")


def term(word: str) -> str:
    """Normalize a word so "Calls"/"call" count as one topic."""
    w = word.lower()
    return w[:-1] if len(w) > 4 and w.endswith("s") and not w.endswith("ss") else w
